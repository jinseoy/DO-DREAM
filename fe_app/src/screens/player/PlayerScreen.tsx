import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  findNodeHandle,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  PlayerScreenNavigationProp,
  PlayerScreenRouteProp,
} from "../../navigation/navigationTypes";
import { getChapterById } from "../../data/dummyChapters";
import { getQuizzesByChapterId } from "../../data/dummyQuizzes";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../../triggers/TriggerContext";
import ttsService from "../../services/ttsService";
import { saveProgress, getProgress } from "../../services/appStorage";
import { LocalProgress } from "../../types/progress";
import { PlayMode, PlayModeLabels, PlayModeIcons } from "../../types/playMode";
import {
  createBookmark,
  isBookmarked,
  getBookmarkIdBySection,
  deleteBookmark,
} from "../../services/bookmarkStorage";
import { useAppSettingsStore } from "../../stores/appSettingsStore";
import { asrService } from "../../services/asrService";

export default function PlayerScreen() {
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const route = useRoute<PlayerScreenRouteProp>();
  const { material, chapterId, fromStart } = route.params;

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const appSettings = useAppSettingsStore((state) => state.settings);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isChapterCompleted, setIsChapterCompleted] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("single");
  const [bookmarked, setBookmarked] = useState(false);
  const { setMode, registerPlayPause } = useContext(TriggerContext);

  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const playButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const prevButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const nextButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const isInitialMount = useRef(true);

  const [controlsHeight, setControlsHeight] = useState(0);
  const onControlsLayout = (e: LayoutChangeEvent) =>
    setControlsHeight(e.nativeEvent.layout.height);

  const chapter = getChapterById(chapterId);
  const quizzes = getQuizzesByChapterId(chapterId.toString());
  const hasQuiz = quizzes.length > 0;

  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const didAutoPlayRef = useRef(false);

  // (선택) 하단 플로팅-마이크 연결 상태
  const [micListening, setMicListening] = useState(false);
  const micOffRef = useRef<(() => void) | null>(null);

  // 스크린리더 상태 추적
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then(
      (enabled) => mounted && setScreenReaderEnabled(enabled)
    );
    const sub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => setScreenReaderEnabled(enabled)
    );
    return () => {
      // @ts-ignore (RN 버전별 시그니처 차이)
      sub?.remove?.();
    };
  }, []);

  // 북마크 상태 동기화
  useEffect(() => {
    if (!chapter) return;
    const isCurrentBookmarked = isBookmarked(
      material.id.toString(),
      chapterId,
      currentSectionIndex
    );
    setBookmarked(isCurrentBookmarked);
  }, [currentSectionIndex, material.id, chapterId, chapter]);

  // 자동 재생 보장 로직(지연 + 재시도)
  const ensureAutoPlay = useCallback(
    async (delayMs: number) => {
      setTimeout(async () => {
        try {
          const speaking = await ttsService.isSpeaking();
          const status = ttsService.getStatus();
          if (speaking) {
            setIsPlaying(true);
            return;
          }
          if (
            status === "idle" ||
            status === "stopped" ||
            status === "paused"
          ) {
            if (screenReaderEnabled) {
              let retryCount = 0;
              const maxRetries = 2;
              while (retryCount < maxRetries) {
                await new Promise((r) => setTimeout(r, 300));
                status === "paused"
                  ? await ttsService.resume()
                  : await ttsService.play();
                await new Promise((r) => setTimeout(r, 500));
                const actuallyPlaying = await ttsService.isSpeaking();
                if (actuallyPlaying) {
                  setIsPlaying(true);
                  return;
                }
                retryCount++;
              }
              setIsPlaying(true);
            } else {
              await new Promise((r) => setTimeout(r, 300));
              await ttsService.play();
              setTimeout(async () => {
                const actuallyPlaying = await ttsService.isSpeaking();
                setIsPlaying(actuallyPlaying);
              }, 500);
            }
          }
        } catch {
          setIsPlaying(false);
        }
      }, delayMs);
    },
    [screenReaderEnabled]
  );

  // 물리키/커스텀 트리거용 재생/일시정지
  const isHandlingPlayPause = useRef(false);
  const handlePlayPause = useCallback(async () => {
    if (isHandlingPlayPause.current) return;
    isHandlingPlayPause.current = true;
    try {
      if (isPlaying) {
        await ttsService.pause();
        setIsPlaying(false);
        Haptics.selectionAsync();
      } else {
        const status = ttsService.getStatus();
        if (status === "paused") {
          await ttsService.resume();
        } else {
          await ttsService.play();
        }
        if (screenReaderEnabled) {
          setIsPlaying(true);
          Haptics.selectionAsync();
        } else {
          setTimeout(async () => {
            const actuallyPlaying = await ttsService.isSpeaking();
            if (!actuallyPlaying) {
              await ttsService.stop();
              await new Promise((r) => setTimeout(r, 200));
              await ttsService.play();
              setTimeout(
                async () => setIsPlaying(await ttsService.isSpeaking()),
                300
              );
            } else {
              setIsPlaying(true);
            }
          }, 300);
          Haptics.selectionAsync();
        }
      }
    } catch {
      setIsPlaying(false);
    } finally {
      setTimeout(() => {
        isHandlingPlayPause.current = false;
      }, 500);
    }
  }, [isPlaying, screenReaderEnabled]);

  // 트리거 등록/해제
  useEffect(() => {
    setMode("playpause");
    registerPlayPause(handlePlayPause);
    return () => {
      registerPlayPause(null);
      setMode("voice");
      ttsService.stop();
      if (progressSaveTimerRef.current)
        clearTimeout(progressSaveTimerRef.current);
    };
  }, [handlePlayPause, setMode, registerPlayPause]);

  // 초기화 + 자동재생
  useEffect(() => {
    if (!chapter) return;

    // 이전 진행 불러오기
    const savedProgress = getProgress(material.id.toString(), chapterId);
    let startIndex = 0;
    let savedPlayMode: PlayMode = "single"; // 기본값

    if (savedProgress && !fromStart) {
      startIndex = savedProgress.currentSectionIndex;
      // 저장된 playMode가 있으면 불러오기
      if (savedProgress.playMode) {
        savedPlayMode = savedProgress.playMode;
      }
      setCurrentSectionIndex(startIndex);
      setPlayMode(savedPlayMode);
    }

    // TTS 초기화
    ttsService.initialize(chapter.sections, startIndex, {
      rate: appSettings.ttsRate,
      pitch: appSettings.ttsPitch,
      volume: appSettings.ttsVolume,
      voice: appSettings.ttsVoiceId || undefined,
      playMode: savedPlayMode,
      onStart: () => setIsPlaying(true),
      onDone: () => {
        setIsPlaying(false);
        if (currentSectionIndex === chapter.sections.length - 1) {
          setIsChapterCompleted(true);
          saveProgressData(true);
          AccessibilityInfo.announceForAccessibility(
            "챕터 학습을 완료했습니다."
          );
        }
      },
      onSectionChange: (newIndex) => {
        setCurrentSectionIndex(newIndex);
        setTimeout(
          () => scrollViewRef.current?.scrollTo({ y: 0, animated: true }),
          50
        );
        const delay = screenReaderEnabled ? 3000 : 400;
        ensureAutoPlay(delay);
      },
      onSectionComplete: () => {
        setIsPlaying(false);
        // TalkBack ON 시에는 AccessibilityInfo 사용 안 함 (TTS와 충돌)
        if (!screenReaderEnabled) {
          AccessibilityInfo.announceForAccessibility(
            "부분 완료. 다음 버튼을 눌러서 계속하세요."
          );
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => {
        setIsPlaying(false);
        AccessibilityInfo.announceForAccessibility(
          "음성 재생 오류가 발생했습니다"
        );
      },
    });

    // 초기 음성 안내는 TalkBack ON 시 충돌 가능 → 생략
    if (!screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(
        `${material.title}, ${chapter.title}. ${
          fromStart ? "처음부터" : savedProgress ? "이어서" : ""
        } 재생 시작`
      );
    }

    // 자동재생: TalkBack ON 시 더 긴 지연 후 시작
    const initialDelay = screenReaderEnabled ? 4500 : 700;
    const autoPlayTimer = setTimeout(async () => {
      if (!didAutoPlayRef.current) {
        try {
          if (screenReaderEnabled) {
            let retry = 0;
            const max = 3;
            while (retry < max) {
              await ttsService.stop();
              await new Promise((r) => setTimeout(r, 300));
              await ttsService.play();
              await new Promise((r) => setTimeout(r, 500));
              const speaking = await ttsService.isSpeaking();
              if (speaking) {
                setIsPlaying(true);
                didAutoPlayRef.current = true;
                break;
              }
              retry++;
              if (retry === max) {
                setIsPlaying(true);
                didAutoPlayRef.current = true;
              }
            }
          } else {
            // TalkBack OFF 시 일반 재생
            await ttsService.play();
            didAutoPlayRef.current = true;
            setTimeout(
              async () => setIsPlaying(await ttsService.isSpeaking()),
              500
            );
          }
        } catch {
          setIsPlaying(false);
        }
      }
    }, initialDelay);

    if (isInitialMount.current && !screenReaderEnabled) {
      setTimeout(() => {
        if (playButtonRef.current) {
          const reactTag = findNodeHandle(playButtonRef.current);
          if (reactTag) AccessibilityInfo.setAccessibilityFocus(reactTag);
        }
      }, 100);
      isInitialMount.current = false;
    }

    return () => clearTimeout(autoPlayTimer);
  }, [
    chapter,
    material.id,
    chapterId,
    fromStart,
    screenReaderEnabled,
    ensureAutoPlay,
  ]);

  // 진행도 저장(디바운스)
  useEffect(() => {
    if (!chapter) return;
    if (progressSaveTimerRef.current)
      clearTimeout(progressSaveTimerRef.current);
    progressSaveTimerRef.current = setTimeout(() => {
      saveProgressData(false);
    }, 2000);
  }, [currentSectionIndex, chapter]);

  // 마지막 섹션 여부
  useEffect(() => {
    if (chapter && currentSectionIndex === chapter.sections.length - 1)
      setIsChapterCompleted(true);
    else setIsChapterCompleted(false);
  }, [currentSectionIndex, chapter]);

  const saveProgressData = (isCompleted: boolean) => {
    if (!chapter) return;
    const progress: LocalProgress = {
      materialId: material.id.toString(),
      chapterId: chapterId,
      currentSectionIndex,
      lastAccessedAt: new Date().toISOString(),
      isCompleted,
      playMode,
    };
    saveProgress(progress);
  };

  const handleGoBack = () => {
    saveProgressData(false);
    ttsService.stop();
    AccessibilityInfo.announceForAccessibility("이전 화면으로 돌아갑니다");
    navigation.goBack();
  };

  const handlePrevious = async () => {
    if (!chapter || currentSectionIndex === 0) return;
    await ttsService.previous();
    setIsPlaying(true);
    Haptics.selectionAsync();
  };

  const handleNext = async () => {
    if (!chapter || currentSectionIndex === chapter.sections.length - 1) return;
    await ttsService.next();
    setIsPlaying(true);
    Haptics.selectionAsync();
  };

  const handleModeChange = async () => {
    const modes: PlayMode[] = ["single", "continuous", "repeat"];
    const currentIndex = modes.indexOf(playMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    const wasPlaying = isPlaying;
    setPlayMode(nextMode);
    ttsService.setPlayMode(nextMode);
    saveProgressData(false);
    if (!screenReaderEnabled)
      AccessibilityInfo.announceForAccessibility(
        `${PlayModeLabels[nextMode]} 모드로 변경되었습니다`
      );
    Haptics.selectionAsync();
    if (wasPlaying) {
      const delay = screenReaderEnabled ? 2000 : 1000;
      setTimeout(async () => {
        try {
          await ttsService.stop();
          await new Promise((r) => setTimeout(r, 300));
          await ttsService.play();
          setTimeout(
            async () => setIsPlaying(await ttsService.isSpeaking()),
            500
          );
        } catch {
          setIsPlaying(false);
        }
      }, delay);
    }
  };

  const handleQuestionPress = () => {
    ttsService.stop();
    setIsPlaying(false);
    AccessibilityInfo.announceForAccessibility("질문하기 화면으로 이동합니다");
    navigation.navigate(
      "Question" as any,
      {
        material,
        chapterId,
        sectionIndex: currentSectionIndex,
        autoStartASR: true,
      } as any
    );
  };

  const handleQuizPress = () => {
    if (quizzes.length > 0) {
      ttsService.stop();
      setIsPlaying(false);
      AccessibilityInfo.announceForAccessibility("퀴즈 화면으로 이동합니다");
      navigation.navigate("Quiz", { quiz: quizzes[0] });
    } else {
      AccessibilityInfo.announceForAccessibility("퀴즈가 없습니다");
    }
  };

  const handleSettingsPress = () => {
    ttsService.stop();
    setIsPlaying(false);
    AccessibilityInfo.announceForAccessibility("설정 화면으로 이동합니다.");
    navigation.navigate("Settings");
  };

  // 북마크 추가/제거 핸들러
  const handleToggleBookmark = () => {
    if (!chapter) return;

    const currentSection = chapter.sections[currentSectionIndex];

    if (bookmarked) {
      // 북마크 제거
      const bookmarkId = getBookmarkIdBySection(
        material.id.toString(),
        chapterId,
        currentSectionIndex
      );
      if (bookmarkId) {
        const success = deleteBookmark(bookmarkId);
        if (success) {
          setBookmarked(false);
          AccessibilityInfo.announceForAccessibility("북마크가 제거되었습니다");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } else {
      // 북마크 추가
      try {
        createBookmark({
          materialId: material.id.toString(),
          chapterId: chapterId,
          sectionId: currentSection.id,
          sectionIndex: currentSectionIndex,
          sectionText: currentSection.text,
          sectionType: currentSection.type,
        });
        setBookmarked(true);
        AccessibilityInfo.announceForAccessibility("북마크에 추가되었습니다");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("[Bookmark] Failed to create:", error);
        AccessibilityInfo.announceForAccessibility(
          "북마크 추가에 실패했습니다"
        );
      }
    }
  };

  // 하단에서 바로 질문(플로팅 마이크)
  const startMic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await ttsService.pause();
      setIsPlaying(false);
      if (micOffRef.current) micOffRef.current();
      micOffRef.current = asrService.on((text, isFinal) => {
        if (isFinal && text.trim()) {
          AccessibilityInfo.announceForAccessibility(
            "질문을 인식했습니다. 질문하기 화면으로 이동합니다."
          );
          stopMic(false);
          navigation.navigate(
            "Question" as any,
            {
              material,
              chapterId,
              sectionIndex: currentSectionIndex,
              autoStartASR: true,
            } as any
          );
        }
      });
      await asrService.start({
        lang: "ko-KR",
        interimResults: true,
        continuous: true,
        autoRestart: true,
      });
      setMicListening(true);
      AccessibilityInfo.announceForAccessibility(
        "음성 인식을 시작합니다. 질문을 말씀하세요."
      );
    } catch {
      AccessibilityInfo.announceForAccessibility("마이크 권한이 필요합니다.");
    }
  };
  const stopMic = async (_announce = true) => {
    await Haptics.selectionAsync();
    await asrService.stop();
    setMicListening(false);
    if (micOffRef.current) {
      micOffRef.current();
      micOffRef.current = null;
    }
  };

  if (!chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 20, color: "#666" }}>
            챕터를 불러올 수 없습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const dynamicContentContainer = {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: controlsHeight + 24,
  };
  const currentSection = chapter.sections[currentSectionIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            accessible
            accessibilityLabel="뒤로 가기"
            accessibilityRole="button"
            accessibilityHint="이전 화면으로 돌아갑니다"
          >
            <Text style={styles.backButtonText}>← 뒤로</Text>
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.bookmarkButton}
              onPress={handleToggleBookmark}
              accessible
              accessibilityLabel={bookmarked ? "저장 해제" : "저장하기"}
              accessibilityRole="button"
              accessibilityHint={
                bookmarked ? "저장을 해제했습니다" : "이 부분을 저장했습니다"
              }
            >
              <Text style={styles.bookmarkButtonText}>
                {bookmarked ? "⭐" : "☆"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modeButton}
              onPress={handleModeChange}
              accessible
              accessibilityLabel={`재생 모드 변경. 현재 ${PlayModeLabels[playMode]}`}
              accessibilityRole="button"
              accessibilityHint="탭하면 다음 모드로 변경됩니다"
            >
              <Text style={styles.modeButtonText}>
                {PlayModeIcons[playMode]}
              </Text>
            </TouchableOpacity>

            {/* 설정 버튼 - Settings로 이동 */}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleSettingsPress}
              accessible
              accessibilityLabel={`설정. 현재 속도 ${appSettings.ttsRate.toFixed(1)}배속`}
              accessibilityRole="button"
              accessibilityHint="TTS 속도와 목소리 등 학습 설정을 변경합니다."
            >
              <Text style={styles.settingsButtonText}>
                ⚙️ {appSettings.ttsRate.toFixed(1)}x
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 챕터 정보 */}
        <View style={styles.headerInfo}>
          <Text style={styles.subjectText}>{material.title}</Text>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
          <Text style={styles.modeIndicator}>
            {PlayModeIcons[playMode]} {PlayModeLabels[playMode]}
          </Text>
        </View>
      </View>

      {/* 내용 */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={dynamicContentContainer}
        accessible
        accessibilityLabel="학습 내용"
      >
        <View style={styles.contentBox}>
          <Text style={styles.contentText}>{currentSection.text}</Text>
        </View>

        <Text style={styles.counterText}>
          {currentSectionIndex + 1} / {chapter.sections.length}
        </Text>
      </ScrollView>

      {/* 컨트롤 */}
      <View style={styles.controls} onLayout={onControlsLayout}>
        <TouchableOpacity
          ref={prevButtonRef}
          style={[
            styles.controlButton,
            currentSectionIndex === 0 && styles.disabledButton,
          ]}
          onPress={handlePrevious}
          disabled={currentSectionIndex === 0}
          accessible
          accessibilityLabel={
            currentSectionIndex === 0 ? "이전 부분 없음" : "이전 부분으로 이동"
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: currentSectionIndex === 0 }}
        >
          <Text style={styles.controlButtonText}>◀ 이전</Text>
        </TouchableOpacity>

        <TouchableOpacity
          ref={playButtonRef}
          style={[styles.controlButton, styles.playButton]}
          onPress={handlePlayPause}
          accessible
          accessibilityLabel={isPlaying ? "일시정지" : "재생"}
          accessibilityRole="button"
          accessibilityHint={
            isPlaying ? "음성을 일시정지합니다" : "음성을 재생합니다"
          }
        >
          <Text style={styles.playButtonText}>{isPlaying ? "일시정지" : "재생"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          ref={nextButtonRef}
          style={[
            styles.controlButton,
            chapter && currentSectionIndex === chapter.sections.length - 1
              ? styles.disabledButton
              : null,
          ]}
          onPress={handleNext}
          disabled={
            chapter
              ? currentSectionIndex === chapter.sections.length - 1
              : false
          }
          accessible
          accessibilityLabel={
            chapter && currentSectionIndex === chapter.sections.length - 1
              ? "다음 부분 없음. 마지막 부분입니다"
              : "다음 부분으로 이동"
          }
          accessibilityRole="button"
          accessibilityState={{
            disabled: chapter
              ? currentSectionIndex === chapter.sections.length - 1
              : false,
          }}
        >
          <Text style={styles.controlButtonText}>다음 ▶</Text>
        </TouchableOpacity>
      </View>

      {/* 하단 질문하기 버튼 */}
      <View style={styles.bottomActionWrap}>
        <TouchableOpacity
          style={styles.askButton}
          onPress={handleQuestionPress}
          accessible
          accessibilityLabel="질문하기"
          accessibilityRole="button"
          accessibilityHint="음성으로 질문할 수 있는 화면으로 이동하며, 바로 말하기가 시작됩니다"
        >
          <Text style={styles.askButtonText}>질문하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },

  // 헤더
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 70,
    minHeight: 44,
  },
  backButtonText: { fontSize: 18, color: "#2196F3", fontWeight: "600" },
  headerButtons: { flexDirection: "row", gap: 8 },

  bookmarkButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFB300",
    minWidth: 52,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkButtonText: { fontSize: 26 },

  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2196F3",
    minWidth: 52,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonText: { fontSize: 26 },

  settingsButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#E1F5FE",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#039BE5",
    minWidth: 80,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsButtonText: { fontSize: 17, color: "#039BE5", fontWeight: "bold" },

  headerInfo: { marginTop: 4 },
  subjectText: { fontSize: 18, color: "#666666", marginBottom: 4 },
  chapterTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 6,
  },
  modeIndicator: { fontSize: 15, color: "#2196F3", fontWeight: "600" },

  // 본문
  contentBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },
  contentText: {
    fontSize: 26,
    lineHeight: 42,
    color: "#333",
    fontWeight: "500",
  },
  counterText: {
    fontSize: 20,
    color: "#999",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 16,
  },

  // 컨트롤 바
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  controlButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    minWidth: 100,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1976D2",
  },
  disabledButton: {
    backgroundColor: "#BDBDBD",
    borderColor: "#9E9E9E",
    opacity: 0.6,
  },
  controlButtonText: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  playButton: {
    backgroundColor: "#4CAF50",
    minWidth: 120,
    minHeight: 88,
    borderColor: "#388E3C",
  },
  playButtonText: { fontSize: 24, fontWeight: "700", color: "#ffffff" },

  // 하단 버튼
  bottomActionWrap: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
  askButton: {
    backgroundColor: "#FF9800",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#F57C00",
  },
  askButtonText: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
});
