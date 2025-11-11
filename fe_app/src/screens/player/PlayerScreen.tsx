import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
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
  deleteBookmark 
} from "../../services/bookmarkStorage";
import { useAppSettingsStore } from "../../stores/appSettingsStore";

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

  // TalkBack 상태
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  // 스크롤 & 포커스
  const scrollViewRef = useRef<ScrollView>(null);
  const playButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const prevButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const nextButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const isInitialMount = useRef(true);

  // 하단 컨트롤 높이 → ScrollView 패딩 보정
  const [controlsHeight, setControlsHeight] = useState(0);
  const onControlsLayout = (e: LayoutChangeEvent) => {
    setControlsHeight(e.nativeEvent.layout.height);
  };

  const chapter = getChapterById(chapterId);
const quizzes = getQuizzesByChapterId(chapterId.toString());
  const hasQuiz = quizzes.length > 0;

  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const didAutoPlayRef = useRef(false);

  // TalkBack 상태 구독
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderEnabled(enabled);
    });
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", (enabled) =>
      setScreenReaderEnabled(enabled)
    );
    return () => {
      mounted = false;
      // RN 버전에 따라 remove 존재
      // @ts-ignore
      sub?.remove?.();
    };
  }, []);

  // 북마크 상태 확인
  useEffect(() => {
    if (!chapter) return;
    const isCurrentBookmarked = isBookmarked(material.id.toString(), chapterId, currentSectionIndex);
    setBookmarked(isCurrentBookmarked);
  }, [currentSectionIndex, material.id, chapterId, chapter]);

  // 보증 재생: TalkBack 안내가 끝난 뒤 실제로 말하고 있는지 확인하고, 아니면 강제 재생
  const ensureAutoPlay = useCallback(async (delayMs: number) => {
    setTimeout(async () => {
      try {
        const speaking = await ttsService.isSpeaking();
        const status = ttsService.getStatus();
        console.log(`[ensureAutoPlay] Speaking: ${speaking}, Status: ${status}`);
        
        // 실제로 말하고 있으면 그대로 두기 (건드리지 않음)
        if (speaking) {
          console.log('[ensureAutoPlay] Already speaking, no action needed');
          setIsPlaying(true);
          return;
        }
        
        // 말하고 있지 않으면서 idle이 아닌 경우에만 재생 시도
        // RN Tts는 stop()을 호출하면 isSpeaking이 false가 되므로, status를 기준으로 판단
        if (status === 'idle' || status === 'stopped' || status === 'paused') {
          console.log('[ensureAutoPlay] Not speaking and idle/stopped/paused, starting playback...');
          
          // TalkBack ON 시 재시도 로직
          if (screenReaderEnabled) {
            let retryCount = 0;
            const maxRetries = 2;
            
            while (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 300));
              // paused 상태였다면 resume, 아니면 play
              status === 'paused' ? await ttsService.resume() : await ttsService.play();
              
              await new Promise(resolve => setTimeout(resolve, 500));
              const actuallyPlaying = await ttsService.isSpeaking();
              
              console.log(`[ensureAutoPlay] Retry ${retryCount + 1}/${maxRetries}, Playing: ${actuallyPlaying}`);
              
              if (actuallyPlaying) {
                setIsPlaying(true);
                return;
              }
              
              retryCount++;
            }
            
            // 재시도 실패해도 상태 업데이트
            console.log('[ensureAutoPlay] Retries failed, updating state anyway');
            setIsPlaying(true);
          } else {
            // TalkBack OFF 시 일반 재생
            await new Promise(resolve => setTimeout(resolve, 300));
            await ttsService.play();
            
            setTimeout(async () => {
              const actuallyPlaying = await ttsService.isSpeaking();
              console.log(`[ensureAutoPlay] Verification - Actually playing: ${actuallyPlaying}`);
              setIsPlaying(actuallyPlaying);
            }, 500);
          }
        } else {
          console.log('[ensureAutoPlay] Status is playing but not speaking - likely just finished or error');
          // setIsPlaying(false); // TTS Service의 onDone/onError 콜백에 맡김
        }
      } catch (err) {
        console.error('[ensureAutoPlay] Error:', err);
        setIsPlaying(false);
      }
    }, delayMs);
  }, [screenReaderEnabled]);

  // 버튼 중복 실행 방지용 ref
  const isHandlingPlayPause = useRef(false);

  // 재생/일시정지 핸들러 - useCallback으로 안정화
  const handlePlayPause = useCallback(async () => {
    // 이미 처리 중이면 무시 (디바운싱)
    if (isHandlingPlayPause.current) {
      console.log('[handlePlayPause] Already handling, skipping...');
      return;
    }

    isHandlingPlayPause.current = true;
    console.log(`[handlePlayPause] Current isPlaying: ${isPlaying}, TalkBack: ${screenReaderEnabled}`);
    
    try {
      if (isPlaying) {
        // 일시정지 (RN Tts는 stop()으로 처리)
        await ttsService.pause(); // pause()는 내부적으로 stop() 호출 후 상태를 'paused'로 변경
        setIsPlaying(false);
        Haptics.selectionAsync();
      } else {
        // 재생/재개
        const status = ttsService.getStatus();
        
        if (status === 'paused') {
            await ttsService.resume();
        } else {
            await ttsService.play();
        }
        
        // TalkBack ON 시에는 재생 검증 없이 바로 상태 업데이트
        if (screenReaderEnabled) {
          setIsPlaying(true);
          Haptics.selectionAsync();
        } else {
          // TalkBack OFF 시에만 재생 검증
          setTimeout(async () => {
            const actuallyPlaying = await ttsService.isSpeaking();
            console.log(`[handlePlayPause] Verification - Actually playing: ${actuallyPlaying}`);
            
            if (!actuallyPlaying) {
              console.log('[handlePlayPause] Retry playback...');
              await ttsService.stop();
              await new Promise(resolve => setTimeout(resolve, 200));
              await ttsService.play();
              
              setTimeout(async () => {
                const finalCheck = await ttsService.isSpeaking();
                setIsPlaying(finalCheck);
              }, 300);
            } else {
              setIsPlaying(true);
            }
          }, 300);
          
          Haptics.selectionAsync();
        }
      }
    } catch (error) {
      console.error('[handlePlayPause] Error:', error);
      setIsPlaying(false);
    } finally {
      // 500ms 후 디바운싱 해제
      setTimeout(() => {
        isHandlingPlayPause.current = false;
      }, 500);
    }
  }, [isPlaying, screenReaderEnabled]);

  // 트리거 모드 - handlePlayPause 의존성 추가
  useEffect(() => {
    setMode("playpause");
    registerPlayPause(handlePlayPause);

    return () => {
      registerPlayPause(null);
      setMode("voice");
      ttsService.stop();
      if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
    };
  }, [handlePlayPause, setMode, registerPlayPause]);

  // 초기화 + 자동재생
  useEffect(() => {
    if (!chapter) return;

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
    

    ttsService.initialize(chapter.sections, startIndex, {
      rate: appSettings.ttsRate,
      pitch: appSettings.ttsPitch,
      volume: appSettings.ttsVolume,
      voice: appSettings.ttsVoiceId || undefined,
      playMode: savedPlayMode,
      onStart: () => {
        setIsPlaying(true);
      },
      onDone: () => {
        setIsPlaying(false);
        if (currentSectionIndex === chapter.sections.length - 1) {
          setIsChapterCompleted(true);
          saveProgressData(true);
          AccessibilityInfo.announceForAccessibility("챕터 학습을 완료했습니다.");
        }
      },
      onSectionChange: (newIndex) => {
        setCurrentSectionIndex(newIndex);
        // 새 섹션으로 이동 시 스크롤 맨 위
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 50);

        // TalkBack 켜진 경우: 안내 음성 뒤 보증 재생
        const delay = screenReaderEnabled ? 3000 : 400;
        ensureAutoPlay(delay);
      },
      onSectionComplete: () => {
        setIsPlaying(false);
        // TalkBack ON 시에는 AccessibilityInfo 사용 안 함 (TTS와 충돌)
        if (!screenReaderEnabled) {
          AccessibilityInfo.announceForAccessibility("부분 완료. 다음 버튼을 눌러서 계속하세요.");
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (error) => {
        console.error("TTS Error:", error);
        setIsPlaying(false);
        AccessibilityInfo.announceForAccessibility("음성 재생 오류가 발생했습니다");
      },
    });

    // 초기 음성 안내는 TalkBack ON 시 충돌 가능 → 생략
    if (!screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(
        `${material.title}, ${chapter.title}. ${fromStart ? "처음부터" : savedProgress ? "이어서" : ""} 재생 시작`
      );
    }

    // 자동재생: TalkBack ON 시 더 긴 지연 후 시작
    const delay = screenReaderEnabled ? 4500 : 700;
    const autoPlayTimer = setTimeout(async () => {
      if (!didAutoPlayRef.current) {
        try {
          console.log('[autoPlay] Starting initial playback...');
          
          // TalkBack ON 상태에서는 여러 번 재생 시도
          if (screenReaderEnabled) {
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
              await ttsService.stop();
              await new Promise(resolve => setTimeout(resolve, 300));
              await ttsService.play();
              
              // 실제로 재생되는지 확인
              await new Promise(resolve => setTimeout(resolve, 500));
              const speaking = await ttsService.isSpeaking();
              
              console.log(`[autoPlay] Retry ${retryCount + 1}/${maxRetries}, Speaking: ${speaking}`);
              
              if (speaking) {
                setIsPlaying(true);
                didAutoPlayRef.current = true;
                break;
              }
              
              retryCount++;
              
              // 마지막 시도에도 실패하면 상태만 업데이트
              if (retryCount === maxRetries) {
                console.log('[autoPlay] All retries failed, setting playing state anyway');
                setIsPlaying(true);
                didAutoPlayRef.current = true;
              }
            }
          } else {
            // TalkBack OFF 시 일반 재생
            await ttsService.play();
            didAutoPlayRef.current = true;
            
            setTimeout(async () => {
              const actuallyPlaying = await ttsService.isSpeaking();
              console.log(`[autoPlay] Playing check: ${actuallyPlaying}`);
              setIsPlaying(actuallyPlaying);
            }, 500);
          }
        } catch (err) {
          console.error('[autoPlay] Error:', err);
          setIsPlaying(false);
        }
      }
    }, delay);

    // 초기에 버튼으로 강제 포커스 → TalkBack ON일 땐 생략 (충돌 방지)
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
  }, [chapter, material.id, chapterId, fromStart, screenReaderEnabled, ensureAutoPlay]);

  // 진행도 저장(디바운스)
  useEffect(() => {
    if (!chapter) return;
    if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
    progressSaveTimerRef.current = setTimeout(() => {
      saveProgressData(false);
    }, 2000);
  }, [currentSectionIndex, chapter]);

  // 챕터 완료 여부
  useEffect(() => {
    if (chapter && currentSectionIndex === chapter.sections.length - 1) {
      setIsChapterCompleted(true);
    } else {
      setIsChapterCompleted(false);
    }
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

    // TalkBack ON 상태에서는 포커스를 재생 버튼으로 이동
    if (screenReaderEnabled) {
      setTimeout(() => {
        if (playButtonRef.current) {
          const reactTag = findNodeHandle(playButtonRef.current);
          if (reactTag) {
            AccessibilityInfo.setAccessibilityFocus(reactTag);
          }
        }
      }, 100);
    }
  };

  const handleNext = async () => {
    if (!chapter || currentSectionIndex === chapter.sections.length - 1) return;

    await ttsService.next();
    setIsPlaying(true);
    Haptics.selectionAsync();

    // TalkBack ON 상태에서는 포커스를 재생 버튼으로 이동
    if (screenReaderEnabled) {
      setTimeout(() => {
        if (playButtonRef.current) {
          const reactTag = findNodeHandle(playButtonRef.current);
          if (reactTag) {
            AccessibilityInfo.setAccessibilityFocus(reactTag);
          }
        }
      }, 100);
    }
  };

  const handleModeChange = async () => {
    const modes: PlayMode[] = ["single", "continuous", "repeat"];
    const currentIndex = modes.indexOf(playMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];

    // 현재 재생 중인지 확인
    const wasPlaying = isPlaying;

    setPlayMode(nextMode);
    ttsService.setPlayMode(nextMode);

    // playMode 변경 시 즉시 저장
    saveProgressData(false);

    // TalkBack ON 시에는 AccessibilityInfo 사용 안 함 (TTS와 충돌)
    if (!screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(`${PlayModeLabels[nextMode]} 모드로 변경되었습니다`);
    }
    Haptics.selectionAsync();

    // 재생 중이었다면 재생 재개
    if (wasPlaying) {
      console.log('[handleModeChange] Was playing, resuming...');
      // TalkBack ON일 때는 더 긴 지연
      const delay = screenReaderEnabled ? 2000 : 1000;
      setTimeout(async () => {
        try {
          // 현재 섹션부터 다시 재생
          await ttsService.stop();
          await new Promise(resolve => setTimeout(resolve, 300));
          await ttsService.play();
          
          // 실제 재생 확인
          setTimeout(async () => {
            const actuallyPlaying = await ttsService.isSpeaking();
            setIsPlaying(actuallyPlaying);
            console.log(`[handleModeChange] Resumed - Actually playing: ${actuallyPlaying}`);
          }, 500);
        } catch (err) {
          console.error('[handleModeChange] Resume error:', err);
          setIsPlaying(false);
        }
      }, delay);
    }
  };


  const handleQuestionPress = () => {
    ttsService.stop();
    setIsPlaying(false);
    AccessibilityInfo.announceForAccessibility("질문하기 화면으로 이동합니다");
    navigation.navigate("Question", {
      material,
      chapterId,
      sectionIndex: currentSectionIndex,
    });
  };

  const handleQuizPress = () => {
    if (quizzes.length > 0) {
      ttsService.stop();
      setIsPlaying(false);
      AccessibilityInfo.announceForAccessibility("퀴즈 화면으로 이동합니다");
      navigation.navigate('Quiz', { quiz: quizzes[0] });
    } else {
      AccessibilityInfo.announceForAccessibility("퀴즈가 없습니다");
    }
  };

  // 북마크 추가/제거 핸들러
  const handleToggleBookmark = () => {
    if (!chapter) return;

    const currentSection = chapter.sections[currentSectionIndex];
    
    if (bookmarked) {
      // 북마크 제거
      const bookmarkId = getBookmarkIdBySection(material.id.toString(), chapterId, currentSectionIndex);
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
        console.error('[Bookmark] Failed to create:', error);
        AccessibilityInfo.announceForAccessibility("북마크 추가에 실패했습니다");
      }
    }
  };

  // 설정 화면 이동 핸들러
  const handleSettingsPress = () => {
    ttsService.stop();
    setIsPlaying(false);
    AccessibilityInfo.announceForAccessibility("설정 화면으로 이동합니다.");
    navigation.navigate('Settings'); 
  }


  if (!chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 20, color: "#666" }}>챕터를 불러올 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentSection = chapter.sections[currentSectionIndex];
  const dynamicContentContainer = {
    ...styles.contentContainer,
    paddingBottom: controlsHeight + 24,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            accessible={true}
            accessibilityLabel="뒤로 가기"
            accessibilityRole="button"
            accessibilityHint="이전 화면으로 돌아갑니다"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backButtonText}>← 뒤로</Text>
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.bookmarkButton}
              onPress={handleToggleBookmark}
              accessible={true}
              accessibilityLabel={bookmarked ? "북마크 제거" : "북마크 추가"}
              accessibilityRole="button"
              accessibilityHint={bookmarked ? "이 섹션의 북마크를 제거합니다" : "이 섹션을 북마크에 추가합니다"}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.bookmarkButtonText}>
                {bookmarked ? "⭐" : "☆"}
              </Text>
            </TouchableOpacity>
            

            <TouchableOpacity
              style={styles.modeButton}
              onPress={handleModeChange}
              accessible={true}
              accessibilityLabel={`재생 모드 변경. 현재 ${PlayModeLabels[playMode]}`}
              accessibilityRole="button"
              accessibilityHint="탭하면 다음 모드로 변경됩니다"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.modeButtonText}>
                {PlayModeIcons[playMode]}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleSettingsPress}
              accessible={true}
              accessibilityLabel={`설정. 현재 속도 ${appSettings.ttsRate.toFixed(1)}배속`}
              accessibilityRole="button"
              accessibilityHint="TTS 속도, 음성 등 학습 설정을 변경합니다."
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
        style={styles.contentArea}
        contentContainerStyle={dynamicContentContainer}
        accessible={true}
        accessibilityLabel="학습 내용"
      >
        <View style={styles.contentTextContainer}>
          <Text style={styles.contentText}>{currentSection.text}</Text>
        </View>

        <Text style={styles.progressText}>
          {currentSectionIndex + 1} / {chapter.sections.length}
        </Text>

        {isChapterCompleted && hasQuiz && (
          <View style={styles.completionSection}>
            <Text style={styles.completionText}>🎉 챕터 학습 완료!</Text>
            <TouchableOpacity
              style={styles.completionQuizButton}
              onPress={handleQuizPress}
              accessible={true}
              accessibilityLabel="퀴즈 풀기"
              accessibilityRole="button"
              accessibilityHint="학습한 내용을 확인하는 퀴즈를 풉니다"
            >
              <Text style={styles.completionQuizButtonText}>📝 퀴즈 풀기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 컨트롤 */}
      <View style={styles.controlsContainer} onLayout={onControlsLayout}>
        <TouchableOpacity
          ref={prevButtonRef}
          style={[styles.controlButton, currentSectionIndex === 0 && styles.disabledButton]}
          onPress={handlePrevious}
          disabled={currentSectionIndex === 0}
          accessible={true}
          accessibilityLabel={currentSectionIndex === 0 ? "이전 부분 없음" : "이전 부분으로 이동"}
          accessibilityRole="button"
          accessibilityState={{ disabled: currentSectionIndex === 0 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.controlButtonText}>
            ◀ 이전
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          ref={playButtonRef}
          style={[styles.controlButton, styles.playButton]}
          onPress={handlePlayPause}
          accessible={true}
          accessibilityLabel={isPlaying ? "일시정지" : "재생"}
          accessibilityRole="button"
          accessibilityHint={isPlaying ? "음성을 일시정지합니다" : "음성을 재생합니다. 두 손가락으로 두 번 탭해도 제어할 수 있습니다"}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.playButtonText}>
            {isPlaying ? "⏸" : "▶"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          ref={nextButtonRef}
          style={[
            styles.controlButton,
            chapter && currentSectionIndex === chapter.sections.length - 1 ? styles.disabledButton : null,
          ]}
          onPress={handleNext}
          disabled={chapter ? currentSectionIndex === chapter.sections.length - 1 : false}
          accessible={true}
          accessibilityLabel={
            chapter && currentSectionIndex === chapter.sections.length - 1
              ? "다음 부분 없음. 마지막 부분입니다"
              : "다음 부분으로 이동"
          }
          accessibilityRole="button"
          accessibilityState={{
            disabled: chapter ? currentSectionIndex === chapter.sections.length - 1 : false,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.controlButtonText}>
            다음 ▶
          </Text>
        </TouchableOpacity>
      </View>

      {/* 하단 질문하기 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.voiceQueryButton}
          onPress={handleQuestionPress}
          accessible={true}
          accessibilityLabel="질문하기"
          accessibilityRole="button"
          accessibilityHint="음성으로 질문할 수 있는 화면으로 이동합니다"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.voiceQueryText}>
            🎤 질문하기
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  backButton: { paddingVertical: 8, paddingHorizontal: 4, minWidth: 70, minHeight: 44 },
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
  settingsButtonText: { 
    fontSize: 17, 
    color: "#039BE5", 
    fontWeight: "bold" 
  },
  headerInfo: { marginTop: 4 },
  subjectText: { fontSize: 18, color: "#666666", marginBottom: 4 },
  chapterTitle: { fontSize: 24, fontWeight: "bold", color: "#333333", marginBottom: 6 },
  modeIndicator: { fontSize: 15, color: "#2196F3", fontWeight: "600" },
  contentArea: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  contentTextContainer: { padding: 16, borderRadius: 12, marginBottom: 20 },
  contentText: { fontSize: 26, lineHeight: 42, color: "#333333", fontWeight: "500" },
  progressText: { fontSize: 20, color: "#999999", textAlign: "center", fontWeight: "600", marginBottom: 16 },
  completionSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#4CAF50",
    alignItems: "center",
  },
  completionText: { fontSize: 24, fontWeight: "bold", color: "#2E7D32", marginBottom: 16, textAlign: "center" },
  completionQuizButton: {
    backgroundColor: "#9C27B0",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 80,
    width: "100%",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#7B1FA2",
  },
  completionQuizButtonText: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
  controlsContainer: {
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
  disabledButton: { backgroundColor: "#BDBDBD", borderColor: "#9E9E9E", opacity: 0.6 },
  controlButtonText: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  playButton: { backgroundColor: "#4CAF50", minWidth: 120, minHeight: 88, borderColor: "#388E3C" },
  playButtonText: { fontSize: 40, color: "#ffffff" },
  bottomButtons: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  voiceQueryButton: {
    backgroundColor: "#FF9800",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#F57C00",
  },
  voiceQueryText: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
});