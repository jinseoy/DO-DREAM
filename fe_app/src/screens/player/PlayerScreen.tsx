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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  PlayerScreenNavigationProp,
  PlayerScreenRouteProp,
} from "../../navigation/navigationTypes";
import { getChapterById } from "../../data/dummyChapters";
import { getQuizzesByChapterId } from "../../data/dummyQuizzes";
import { TriggerContext } from "../../triggers/TriggerContext";
import {
  saveProgress,
  savePlayerPosition,
  getPlayerPosition,
} from "../../services/appStorage";
import { LocalProgress } from "../../types/progress";
import { PlayMode } from "../../types/playMode";
import {
  createBookmark,
  isBookmarked,
  getBookmarkIdBySection,
  deleteBookmark,
} from "../../services/bookmarkStorage";
import { useAppSettingsStore } from "../../stores/appSettingsStore";
import PlayerSettingsModal from "../../components/PlayerSettingsModal";
import ChapterCompletionModal from "../../components/ChapterCompletionModal";
import { useTTSPlayer } from "../../hooks/useTTSPlayer";
import { commonStyles } from "../../styles/commonStyles";
import PlayerHeader from "../../components/PlayerHeader";

type PlayModeKey = "single" | "continuous" | "repeat";

const UI_MODE_LABELS: Record<PlayModeKey, string> = {
  continuous: "연속",
  repeat: "반복",
  single: "한 섹션씩",
};

export default function PlayerScreen() {
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const route = useRoute<PlayerScreenRouteProp>();
  const { material, chapterId, fromStart } = route.params;

  const appSettings = useAppSettingsStore((state) => state.settings);
  const [isChapterCompleted, setIsChapterCompleted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const {
    setMode,
    registerPlayPause,
    setCurrentScreenId,
    registerVoiceHandlers,
  } = useContext(TriggerContext);

  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const playButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const prevButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const nextButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  // Modal 상태
  const [modalVisible, setModalVisible] = useState(false);
  const wasPlayingBeforeModal = useRef(false);

  const [controlsHeight, setControlsHeight] = useState(0);
  const onControlsLayout = (e: LayoutChangeEvent) =>
    setControlsHeight(e.nativeEvent.layout.height);

  const chapter = getChapterById(chapterId) || null;
  const quizzes = getQuizzesByChapterId(chapterId.toString());
  const hasQuiz = quizzes.length > 0;

  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 진행률 저장 (명시적 섹션 인덱스 전달)
  const saveProgressData = useCallback(
    (
      isCompleted: boolean,
      sectionIndex?: number,
      playModeOverride?: PlayMode
    ) => {
      if (!chapter) return;

      const sectionIndexToSave =
        sectionIndex ?? ttsStateRef.current.currentSectionIndex;
      const playModeToSave = playModeOverride ?? ttsStateRef.current.playMode;

      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current);
      }

      const materialId = material.id.toString();
      const now = new Date().toISOString();

      progressSaveTimerRef.current = setTimeout(() => {
        const localProgress: LocalProgress = {
          materialId,
          chapterId,
          lastAccessedAt: now,
          currentSectionIndex: sectionIndexToSave,
          isCompleted,
        };
        saveProgress(localProgress);
        savePlayerPosition({
          materialId,
          chapterId,
          sectionIndex: sectionIndexToSave,
          playMode: playModeToSave,
          lastAccessedAt: now,
        });
        console.log("[AppStorage] Player position saved:", {
          materialId,
          chapterId,
          sectionIndex: sectionIndexToSave,
          playMode: playModeToSave,
        });
      }, 800);
    },
    [material.id, chapterId, chapter]
  );

  // saveProgressData가 렌더링마다 바뀌지 않도록 ref로 감싸기
  const saveProgressDataRef = useRef(saveProgressData);
  useEffect(() => {
    saveProgressDataRef.current = saveProgressData;
  }, [saveProgressData]);

  const savedPosition = getPlayerPosition(material.id.toString(), chapterId);
  const initialSectionIndex =
    savedPosition && !fromStart ? savedPosition.sectionIndex : 0;
  const initialPlayMode: PlayMode =
    savedPosition && !fromStart ? savedPosition.playMode : "single";

  const {
    isPlaying,
    currentSectionIndex,
    playMode,
    actions: ttsActions,
  } = useTTSPlayer({
    chapter,
    initialSectionIndex,
    initialPlayMode,
    appSettings,
    onCompletion: useCallback(() => {
      setIsChapterCompleted(true);
      saveProgressDataRef.current(true);
      AccessibilityInfo.announceForAccessibility("챕터 학습을 완료했습니다.");
    }, []),
    onSectionChange: useCallback((newIndex: number) => {
      setTimeout(
        () => scrollViewRef.current?.scrollTo({ y: 0, animated: true }),
        50
      );
      saveProgressDataRef.current(false, newIndex);
    }, []),
  });
  // --- 훅 사용 끝 ---

  // saveProgressData에서 최신 상태를 참조하기 위한 ref
  const ttsStateRef = useRef({ currentSectionIndex, playMode });
  useEffect(() => {
    ttsStateRef.current = { currentSectionIndex, playMode };
  }, [currentSectionIndex, playMode]);

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
      // @ts-ignore
      sub?.remove?.();
    };
  }, []);

  // 저장(북마크) 상태 동기화
  useEffect(() => {
    if (!chapter) return;
    const isCurrentBookmarked = isBookmarked(
      material.id.toString(),
      chapterId,
      currentSectionIndex
    );
    setBookmarked(isCurrentBookmarked);
  }, [currentSectionIndex, material.id, chapterId, chapter]);

  // 화면 이탈 시 진행 상황 저장
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async () => {
      console.log("[PlayerScreen] 화면 이탈 감지 - TTS 정지");
      saveProgressData(false);
    });

    return unsubscribe;
  }, [navigation, saveProgressData]);

  // 질문하기
  const handleQuestionPress = useCallback(async () => {
    await ttsActions.pause();

    AccessibilityInfo.announceForAccessibility(
      "질문하기 화면으로 이동합니다. 음성 인식 버튼을 누른 후 질문해주세요."
    );
    setTimeout(() => {
      navigation.navigate("Question", {
        material,
        chapterId,
        sectionIndex: currentSectionIndex,
      });
    }, 300);
  }, [navigation, material, chapterId, currentSectionIndex, ttsActions]);

  // 설정 변경 버튼
  const handleOpenSettings = useCallback(async () => {
    wasPlayingBeforeModal.current = isPlaying;
    await ttsActions.pause();
    setModalVisible(true);
  }, [isPlaying, ttsActions]);

  // 모달 닫기
  const handleCloseModal = useCallback(async () => {
    setModalVisible(false);

    if (wasPlayingBeforeModal.current) {
      console.log("[PlayerScreen] 모달 닫힘 - 재생 재개");
      setTimeout(() => {
        ttsActions.play();
      }, 300);
      wasPlayingBeforeModal.current = false;
    }
  }, [ttsActions]);

  // 재생 모드 변경
  const handlePlayModeChange = useCallback(
    (newMode: PlayMode) => {
      ttsActions.changePlayMode(newMode);
      savePlayerPosition({
        materialId: material.id.toString(),
        chapterId: chapterId,
        sectionIndex: currentSectionIndex,
        playMode: newMode,
        lastAccessedAt: new Date().toISOString(),
      });
      AccessibilityInfo.announceForAccessibility(
        `${UI_MODE_LABELS[newMode as PlayModeKey]} 모드로 변경했습니다.`
      );
    },
    [material.id, chapterId, currentSectionIndex, ttsActions]
  );

  // 북마크 토글
  const handleToggleBookmark = useCallback(async () => {
    if (!chapter) return;

    const currentlyBookmarked = isBookmarked(
      material.id.toString(),
      chapterId,
      currentSectionIndex
    );

    if (currentlyBookmarked) {
      const bookmarkId = getBookmarkIdBySection(
        material.id.toString(),
        chapterId,
        currentSectionIndex
      );
      if (bookmarkId) {
        deleteBookmark(bookmarkId);
        setBookmarked(false);
        AccessibilityInfo.announceForAccessibility("저장을 해제했습니다");
      }
    } else {
      const currentSection = chapter.sections[currentSectionIndex];
      const newBookmark = {
        materialId: material.id.toString(),
        chapterId: chapterId,
        sectionId: currentSection.id,
        sectionIndex: currentSectionIndex,
        sectionText: currentSection.text.substring(0, 100),
        sectionType: currentSection.type,
      };
      createBookmark(newBookmark);
      setBookmarked(true);
      AccessibilityInfo.announceForAccessibility("현재 위치를 저장했습니다");
    }
  }, [material.id, chapterId, currentSectionIndex, chapter]);

  // 뒤로가기
  const handleBackPress = useCallback(() => {
    Alert.alert(
      "학습 종료",
      "학습을 종료하시겠습니까? 진행 상황은 자동으로 저장됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "종료",
          onPress: () => {
            saveProgressData(false);
            navigation.goBack();
          },
        },
      ]
    );
  }, [navigation, saveProgressData]);

  // 챕터 완료 후 퀴즈 이동
  const handleQuizNavigation = useCallback(() => {
    navigation.replace("QuizList", { material, chapterId });
  }, [navigation, material, chapterId]);

  // 재생 모드 음성 명령 파싱
  const parseModeVoice = (spoken: string): PlayMode | null => {
    const t = spoken.trim().toLowerCase();
    const noSpace = t.replace(/\s+/g, "");

    // single: 하나씩 모드, 한 섹션씩 모드, 한개 모드 등
    if (
      noSpace.includes("하나씩") ||
      noSpace.includes("한개") ||
      noSpace.includes("한개씩") ||
      noSpace.includes("한섹션") ||
      noSpace.includes("한섹션씩")
    ) {
      return "single";
    }

    // continuous: 연속 모드, 계속 모드
    if (
      noSpace.includes("연속") ||
      noSpace.includes("계속모드") ||
      noSpace.includes("계속재생") ||
      noSpace.includes("계속으로")
    ) {
      return "continuous";
    }

    // repeat: 반복 모드
    if (
      noSpace.includes("반복") ||
      noSpace.includes("반복모드") ||
      noSpace.includes("반복재생") ||
      noSpace.includes("반복으로")
    ) {
      return "repeat";
    }

    return null;
  };

  // Player 화면 전용 음성 명령(rawText) 처리
  const handlePlayerVoiceRaw = useCallback(
    (spoken: string) => {
      const t = spoken.trim().toLowerCase();

      // 1) 재생 모드 변경
      const modeFromVoice = parseModeVoice(spoken);
      if (modeFromVoice) {
        handlePlayModeChange(modeFromVoice);
        return;
      }

      // 2) 저장 / 북마크
      if (t.includes("저장") || t.includes("북마크")) {
        handleToggleBookmark();
        return;
      }

      // 3) 설정 / 속도 / 모드 / 목소리
      if (
        t.includes("설정") ||
        t.includes("속도") ||
        t.includes("모드") ||
        t.includes("목소리")
      ) {
        handleOpenSettings();
        return;
      }

      // 4) 질문하기 (전역 파서가 놓친 경우 대비)
      if (t.includes("질문")) {
        handleQuestionPress();
        return;
      }

      // 5) 퀴즈 (전역 파서가 놓친 경우 대비)
      if (t.includes("퀴즈") || t.includes("문제 풀")) {
        if (hasQuiz) {
          handleQuizNavigation();
        } else {
          AccessibilityInfo.announceForAccessibility(
            "이 챕터에는 퀴즈가 없습니다."
          );
        }
        return;
      }

      // 그 외: 안내
      console.log("[VoiceCommands][Player] 처리할 수 없는 rawText:", spoken);
      AccessibilityInfo.announceForAccessibility(
        "이 화면에서 사용할 수 없는 음성 명령입니다. 재생, 일시정지, 다음, 이전, 질문하기, 저장하기, 퀴즈 풀기, 설정 열기, 하나씩 모드, 연속 모드, 반복 모드처럼 말해 주세요."
      );
    },
    [
      handlePlayModeChange,
      handleToggleBookmark,
      handleOpenSettings,
      handleQuestionPress,
      handleQuizNavigation,
      hasQuiz,
    ]
  );

  // 음성 명령 핸들러 등록
  useEffect(() => {
    setCurrentScreenId("Player");

    // 볼륨키 모드: 재생/일시정지
    setMode("playpause");
    registerPlayPause(ttsActions.togglePlayPause);

    registerVoiceHandlers("Player", {
      // 전역 명령
      playPause: ttsActions.togglePlayPause,
      next: ttsActions.playNext,
      prev: ttsActions.playPrevious,
      openQuestion: handleQuestionPress,
      goBack: handleBackPress,
      openQuiz: hasQuiz ? handleQuizNavigation : undefined,
      // Player 전용 rawText 명령
      rawText: handlePlayerVoiceRaw,
    });

    return () => {
      console.log("[PlayerScreen] useEffect cleanup 시작");
      registerPlayPause(null);
      setMode("voice");
      registerVoiceHandlers("Player", {});

      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current);
      }
      console.log("[PlayerScreen] useEffect cleanup 완료");
    };
  }, [
    setCurrentScreenId,
    setMode,
    registerPlayPause,
    registerVoiceHandlers,
    ttsActions.togglePlayPause,
    ttsActions.playNext,
    ttsActions.playPrevious,
    handleQuestionPress,
    handleBackPress,
    hasQuiz,
    handleQuizNavigation,
    handlePlayerVoiceRaw,
  ]);

  // 화면 진입 시 음성 안내 (처음 쓰는 사용자용)
  useEffect(() => {
    const msg =
      "교재 듣기 화면입니다. 상단의 음성 명령 버튼을 두 번 탭한 후, 재생, 일시정지, 다음, 이전, 질문하기, 저장하기, 퀴즈 풀기, 설정 열기, 하나씩 모드, 연속 모드, 반복 모드, 뒤로 가기처럼 말하면 해당 기능이 실행됩니다.";
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(msg);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // 초기 포커스: TalkBack 켜져 있으면 "재생 버튼"에 포커스
  useEffect(() => {
    if (!screenReaderEnabled) return;
    const timer = setTimeout(() => {
      const target = playButtonRef.current || contentRef.current;
      const reactTag = target ? findNodeHandle(target) : null;
      if (reactTag) {
        AccessibilityInfo.setAccessibilityFocus(reactTag);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [screenReaderEnabled]);

  if (!chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>챕터를 불러올 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const currentSection = chapter.sections[currentSectionIndex];
  if (!currentSection) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>섹션을 불러올 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const isLastSection =
    chapter && currentSectionIndex === chapter.sections.length - 1;

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* 헤더 - 재생 중에는 접근성에서 숨김 */}
        <View
          style={styles.header}
          accessibilityElementsHidden={isPlaying}
          importantForAccessibility={isPlaying ? "no-hide-descendants" : "yes"}
        >
          <PlayerHeader
            material={material}
            chapter={chapter}
            playMode={playMode as PlayModeKey}
            isBookmarked={bookmarked}
            onBackPress={handleBackPress}
            onToggleBookmark={handleToggleBookmark}
            onBeforeListen={() => ttsActions.pause()}
          />
        </View>

        {/* 학습 콘텐츠 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: controlsHeight + 20 },
          ]}
        >
          <View
            ref={contentRef}
            style={styles.contentBox}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`${chapter.title}, 섹션 ${
              currentSectionIndex + 1
            } 중 ${currentSectionIndex + 1}번째`}
          >
            <Text style={styles.contentText}>{currentSection.text}</Text>
          </View>

          <Text style={styles.counterText}>
            {currentSectionIndex + 1} / {chapter.sections.length}
          </Text>
        </ScrollView>

        {/* 재생 컨트롤 */}
        <View style={styles.controls} onLayout={onControlsLayout}>
          <TouchableOpacity
            ref={prevButtonRef}
            style={[
              styles.controlButtonPrevNext,
              currentSectionIndex === 0 && styles.disabledButton,
            ]}
            onPress={ttsActions.playPrevious}
            disabled={currentSectionIndex === 0}
            accessible
            accessibilityLabel={
              currentSectionIndex === 0 ? "이전 섹션 없음" : "이전 섹션"
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: currentSectionIndex === 0 }}
          >
            <Text style={styles.controlButtonText}>← 이전</Text>
          </TouchableOpacity>

          <TouchableOpacity
            ref={playButtonRef}
            style={[styles.controlButtonPlay]}
            onPress={ttsActions.togglePlayPause}
            accessible
            accessibilityLabel={isPlaying ? "일시정지" : "재생"}
            accessibilityRole="button"
            accessibilityHint={
              isPlaying ? "음성을 일시정지합니다" : "음성을 재생합니다"
            }
          >
            <Text style={styles.playButtonText}>
              {isPlaying ? "일시정지" : "재생"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            ref={nextButtonRef}
            style={[
              isLastSection
                ? styles.controlButtonComplete
                : styles.controlButtonPrevNext,
            ]}
            onPress={() => {
              if (isLastSection) {
                setIsChapterCompleted(true);
                saveProgressData(true);
                AccessibilityInfo.announceForAccessibility("학습 완료");
              } else {
                ttsActions.playNext();
              }
            }}
            accessible
            accessibilityLabel={isLastSection ? "학습 완료" : "다음 섹션"}
            accessibilityRole="button"
            accessibilityHint={
              isLastSection
                ? "챕터 학습을 완료하고 퀴즈 화면으로 이동합니다"
                : ""
            }
          >
            <Text style={styles.controlButtonText}>
              {isLastSection ? "완료" : "다음 →"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 하단 액션 버튼들 */}
        <View style={styles.bottomActionWrap}>
          <TouchableOpacity
            style={styles.askButton}
            onPress={handleQuestionPress}
            accessible
            accessibilityLabel="질문하기"
            accessibilityRole="button"
            accessibilityHint="음성으로 질문할 수 있는 화면으로 이동합니다"
          >
            <Text style={styles.askButtonText}>질문하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={handleOpenSettings}
            accessible
            accessibilityLabel="설정 변경"
            accessibilityHint="재생 모드, 속도 설정을 변경할 수 있습니다"
            accessibilityRole="button"
          >
            <Text style={styles.moreButtonText}>설정 변경</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <PlayerSettingsModal
        visible={modalVisible}
        currentPlayMode={playMode}
        onPlayModeChange={handlePlayModeChange}
        onClose={handleCloseModal}
      />
      <ChapterCompletionModal
        visible={isChapterCompleted && hasQuiz}
        onQuiz={handleQuizNavigation}
        onSkip={() => {
          setIsChapterCompleted(false);
          navigation.goBack();
        }}
      />
    </>
  );
}

const CONTROL_BTN_MIN_HEIGHT = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },

  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  contentBox: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },
  contentText: {
    fontSize: 28,
    lineHeight: 44,
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

  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 2,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
    gap: 12,
  },

  controlButtonPrevNext: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    minWidth: 100,
    minHeight: CONTROL_BTN_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1976D2",
  },
  controlButtonText: { fontSize: 20, fontWeight: "800", color: "#ffffff" },

  controlButtonComplete: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#FF9800",
    minWidth: 100,
    minHeight: CONTROL_BTN_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F57C00",
  },
  controlButtonPlay: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#4CAF50",
    minWidth: 130,
    minHeight: CONTROL_BTN_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#388E3C",
  },
  playButtonText: { fontSize: 22, fontWeight: "900", color: "#ffffff" },

  disabledButton: {
    backgroundColor: "#BDBDBD",
    borderColor: "#9E9E3E",
    opacity: 0.6,
  },

  bottomActionWrap: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    gap: 12,
  },
  askButton: {
    backgroundColor: "#FF9500",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 72,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#E68A00",
  },
  askButtonText: { fontSize: 24, fontWeight: "bold", color: "#FFFFFF" },

  moreButton: {
    backgroundColor: "#E3F2FD",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    minHeight: 64,
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  moreButtonText: { fontSize: 20, fontWeight: "bold", color: "#0D47A1" },

  errorText: {
    fontSize: 20,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
  },
});