import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
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
import { TriggerContext } from "../../triggers/TriggerContext";
import {
  saveProgress,
  savePlayerPosition,
  getPlayerPosition,
} from "../../services/appStorage";
import { LocalProgress } from "../../types/progress";
import { PlayMode } from "../../types/playMode";
import { useAppSettingsStore } from "../../stores/appSettingsStore";
import PlayerSettingsModal from "../../components/PlayerSettingsModal";
import { useTTSPlayer } from "../../hooks/useTTSPlayer";
import SectionRenderer from "../../components/SectionRenderer";
import PlayerHeader from "../../components/PlayerHeader";
import { buildChaptersFromMaterialJson } from "../../utils/materialJsonMapper";
import type { Chapter, Section } from "../../types/chapter";
import {
  toggleBookmark,
  fetchBookmarksByMaterial,
} from "../../api/bookmarkApi";
import { updateProgress } from "../../api/progressApi";
import { useTheme } from "../../contexts/ThemeContext";

type PlayModeKey = "single" | "continuous" | "repeat";

const UI_MODE_LABELS: Record<PlayModeKey, string> = {
  continuous: "연속",
  repeat: "반복",
  single: "한 섹션씩",
};

export default function PlayerScreen() {
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const route = useRoute<PlayerScreenRouteProp>() as any;

  const { colors, fontSize: themeFont } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, themeFont), [colors, themeFont]);

  const {
    material,
    chapterId,
    fromStart,
    initialSectionIndex: initialSectionIndexFromRoute,
  } = route.params;

  const appSettings = useAppSettingsStore((state) => state.settings);

  // 서버 북마크 상태
  const [bookmarked, setBookmarked] = useState(false);

  const {
    setMode,
    registerPlayPause,
    registerTTSPlay,
    registerTTSPause,
    setCurrentScreenId,
    registerVoiceHandlers,
  } = useContext(TriggerContext);

  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const playButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const prevButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const nextButtonRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const wasPlayingBeforeModal = useRef(false);

  const [controlsHeight, setControlsHeight] = useState(0);
  const onControlsLayout = (e: LayoutChangeEvent) =>
    setControlsHeight(e.nativeEvent.layout.height);
  // JSON → Chapter[] 변환
  const chaptersFromJson: Chapter[] = useMemo(() => {
    const anyMaterial: any = material;
    const json = anyMaterial?.json;
    if (json && Array.isArray(json.chapters)) {
      return buildChaptersFromMaterialJson(material.id, json);
    }
    return [];
  }, [material]);

  // 현재 챕터 찾기
  const chapter: Chapter | null = useMemo(() => {
    if (chaptersFromJson.length === 0) {
      return null;
    }

    const targetChapterId =
      typeof chapterId === "string" ? Number(chapterId) : chapterId;

    const found = chaptersFromJson.find((c) => c.chapterId === targetChapterId);

    return found ?? chaptersFromJson[0];
  }, [chaptersFromJson, chapterId]);

  // 현재 챕터 index 계산
  const currentChapterIndex = useMemo(() => {
    if (!chapter) return -1;
    const index = chaptersFromJson.findIndex(
      (c) => c.chapterId === chapter.chapterId
    );
    return index;
  }, [chaptersFromJson, chapter]);

  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter =
    currentChapterIndex >= 0 &&
    currentChapterIndex < chaptersFromJson.length - 1;

  // 서버에서 북마크 여부 로드
  useEffect(() => {
    let cancelled = false;

    const loadBookmarkState = async () => {
      try {
        const res = await fetchBookmarksByMaterial(material.id);
        const isBookmarkedOnServer = res.bookmarkedTitleIds.includes(
          String(chapterId)
        );

        if (!cancelled) {
          setBookmarked(isBookmarkedOnServer);
        }
      } catch (e) {
        console.error("[PlayerScreen] 서버 북마크 조회 실패:", e);
      }
    };

    loadBookmarkState();
    return () => {
      cancelled = true;
    };
  }, [material.id, chapterId]);

  // 진행률 저장용 ref
  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ttsStateRef = useRef<{
    currentSectionIndex: number;
    playMode: PlayMode;
  }>({ currentSectionIndex: 0, playMode: "single" });

  // 진행률 저장 함수
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
      }, 800);
    },
    [material.id, chapterId, chapter]
  );

  const saveProgressDataRef = useRef(saveProgressData);
  useEffect(() => {
    saveProgressDataRef.current = saveProgressData;
  }, [saveProgressData]);

  // 저장된 시청 위치 로드 + BookmarkListScreen 초기 인덱스 처리
  const savedPosition = getPlayerPosition(material.id.toString(), chapterId);

  const initialSectionIndex: number = useMemo(() => {
    if (
      initialSectionIndexFromRoute != null &&
      typeof initialSectionIndexFromRoute === "number" &&
      !fromStart
    ) {
      return initialSectionIndexFromRoute;
    }
    if (savedPosition && !fromStart) {
      return savedPosition.sectionIndex;
    }
    return 0;
  }, [initialSectionIndexFromRoute, fromStart, savedPosition]);

  const initialPlayMode: PlayMode = useMemo(() => {
    if (savedPosition && !fromStart) {
      return savedPosition.playMode;
    }
    return "single";
  }, [savedPosition, fromStart]);

  // TTS Player Hook
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
      saveProgressDataRef.current(true);
      AccessibilityInfo.announceForAccessibility("챕터 학습을 완료했습니다.");
    }, []),
    onSectionChange: useCallback((newIndex: number) => {
      setTimeout(
        () =>
          scrollViewRef.current?.scrollTo({
            y: 0,
            animated: true,
          }),
        50
      );
      saveProgressDataRef.current(false, newIndex);
    }, []),
  });

  useEffect(() => {
    ttsStateRef.current = { currentSectionIndex, playMode };
  }, [currentSectionIndex, playMode]);

  // 백엔드에 진행률 업데이트 (API 호출)
  const updateProgressToBackend = useCallback(async () => {
    if (!chapter) return;

    const currentPage = currentSectionIndex + 1;
    const totalPages = chapter.sections.length;

    try {
      await updateProgress({
        materialId: material.id,
        currentPage,
        totalPages,
      });
    } catch (error) {
      console.error("[PlayerScreen] 진행률 업데이트 실패:", error);
    }
  }, [material.id, chapter, currentSectionIndex]);

  // 스크린리더 상태 추적
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderEnabled(enabled);
    });

    const sub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => {
        if (mounted) setScreenReaderEnabled(enabled);
      }
    );

    return () => {
      mounted = false;
      // @ts-ignore
      sub?.remove?.();
    };
  }, []);

  // 화면 이탈 시 진행 상황 저장
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async () => {
      saveProgressData(false);
      await updateProgressToBackend();
    });
    return unsubscribe;
  }, [navigation, saveProgressData, updateProgressToBackend]);

  // 질문하기 화면 이동
  const handleQuestionPress = useCallback(async () => {
    await ttsActions.pause();
    await updateProgressToBackend();

    AccessibilityInfo.announceForAccessibility("질문하기 화면으로 이동합니다.");
    setTimeout(() => {
      navigation.navigate("Question", {
        material,
        chapterId,
        sectionIndex: currentSectionIndex,
      });
    }, 300);
  }, [
    navigation,
    material,
    chapterId,
    currentSectionIndex,
    ttsActions,
    updateProgressToBackend,
  ]);

  // 설정 열기
  const handleOpenSettings = useCallback(async () => {
    wasPlayingBeforeModal.current = isPlaying;
    await ttsActions.pause();
    setModalVisible(true);
  }, [isPlaying, ttsActions]);

  const handleCloseModal = useCallback(async () => {
    setModalVisible(false);
    if (wasPlayingBeforeModal.current) {
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

    const currentlyBookmarked = bookmarked;
    const titleId = String(chapterId);

    try {
      await toggleBookmark({
        materialId: material.id,
        titleId,
      });

      const next = !currentlyBookmarked;
      setBookmarked(next);

      AccessibilityInfo.announceForAccessibility(
        next ? "현재 챕터를 저장했습니다" : "저장을 해제했습니다"
      );
    } catch (error) {
      console.error("[PlayerScreen] toggleBookmark 실패:", error);
      AccessibilityInfo.announceForAccessibility(
        "저장 상태 변경 중 오류가 발생했습니다."
      );
    }
  }, [chapter, chapterId, material.id, bookmarked]);

  // 챕터 이동
  const handleMoveChapter = useCallback(
    async (direction: "prev" | "next") => {
      if (!chapter) {
        AccessibilityInfo.announceForAccessibility(
          "챕터 정보를 불러오지 못했습니다."
        );
        return;
      }
      if (currentChapterIndex === -1) {
        AccessibilityInfo.announceForAccessibility(
          "현재 챕터 위치를 알 수 없습니다."
        );
        return;
      }

      const targetIndex =
        direction === "prev"
          ? currentChapterIndex - 1
          : currentChapterIndex + 1;

      if (targetIndex < 0 || targetIndex >= chaptersFromJson.length) {
        AccessibilityInfo.announceForAccessibility(
          direction === "prev"
            ? "이전 챕터가 없습니다."
            : "다음 챕터가 없습니다."
        );
        return;
      }

      const targetChapter = chaptersFromJson[targetIndex];

      saveProgressData(false);
      ttsActions.pause();
      await updateProgressToBackend();

      AccessibilityInfo.announceForAccessibility(
        direction === "prev"
          ? `이전 챕터로 이동합니다. ${targetChapter.title}`
          : `다음 챕터로 이동합니다. ${targetChapter.title}`
      );

      navigation.replace("Player", {
        material,
        chapterId: targetChapter.chapterId,
        fromStart: true,
        initialSectionIndex: 0,
      });
    },
    [
      chapter,
      currentChapterIndex,
      chaptersFromJson,
      material,
      navigation,
      saveProgressData,
      ttsActions,
      updateProgressToBackend,
    ]
  );

  const handlePrevChapter = useCallback(
    () => handleMoveChapter("prev"),
    [handleMoveChapter]
  );
  const handleNextChapter = useCallback(
    () => handleMoveChapter("next"),
    [handleMoveChapter]
  );

  // 뒤로 가기
  const handleBackPress = useCallback(async () => {
    saveProgressData(false);
    await updateProgressToBackend();
    navigation.goBack();
  }, [navigation, saveProgressData, updateProgressToBackend]);

  // 챕터 완료 처리
  const handleChapterComplete = useCallback(async () => {
    saveProgressData(true);
    await updateProgressToBackend();

    if (hasNextChapter) {
      const nextChapterData = chaptersFromJson[currentChapterIndex + 1];
      AccessibilityInfo.announceForAccessibility(
        `챕터 학습을 완료했습니다. 다음 챕터로 이동합니다. ${nextChapterData.title}`
      );

      navigation.replace("Player", {
        material,
        chapterId: nextChapterData.chapterId,
        fromStart: true,
        initialSectionIndex: 0,
      });
    } else {
      AccessibilityInfo.announceForAccessibility(
        "모든 챕터 학습을 완료했습니다. 교재 목록으로 돌아갑니다."
      );
      navigation.goBack();
    }
  }, [
    saveProgressData,
    updateProgressToBackend,
    hasNextChapter,
    chaptersFromJson,
    currentChapterIndex,
    material,
    navigation,
  ]);

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

      // 0) 챕터 이동
      if (
        t.includes("다음 챕터") ||
        t.includes("다음 단원") ||
        t.includes("다음 장")
      ) {
        handleNextChapter();
        return;
      }

      if (
        t.includes("이전 챕터") ||
        t.includes("이전 단원") ||
        t.includes("이전 장")
      ) {
        handlePrevChapter();
        return;
      }

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

      // 4) 질문하기
      if (
        t.includes("질문") ||
        t.includes("질문하기") ||
        t.includes("이게 뭐야") ||
        t.includes("알려줘")
      ) {
        handleQuestionPress();
        return;
      }

      // 5) 퀴즈
      if (t.includes("퀴즈") || t.includes("문제 풀")) {
        AccessibilityInfo.announceForAccessibility(
          "퀴즈 기능이 아직 준비 중입니다."
        );
        return;
      }

      console.log("[VoiceCommands][Player] 처리할 수 없는 rawText:", spoken);
      AccessibilityInfo.announceForAccessibility(
        "이 화면에서 사용할 수 없는 음성 명령입니다. 재생, 일시정지, 다음, 이전, 질문하기, 저장하기, 설정 열기, 하나씩 모드, 연속 모드, 반복 모드, 다음 챕터, 이전 챕터처럼 말해 주세요."
      );
    },
    [
      handleNextChapter,
      handlePrevChapter,
      handlePlayModeChange,
      handleToggleBookmark,
      handleOpenSettings,
      handleQuestionPress,
    ]
  );

  // 핸들러를 ref로 저장하여 최신 버전 유지
  const handlePlayerVoiceRawRef = useRef(handlePlayerVoiceRaw);
  useEffect(() => {
    handlePlayerVoiceRawRef.current = handlePlayerVoiceRaw;
  }, [handlePlayerVoiceRaw]);

  const handleQuestionPressRef = useRef(handleQuestionPress);
  useEffect(() => {
    handleQuestionPressRef.current = handleQuestionPress;
  }, [handleQuestionPress]);

  const handleBackPressRef = useRef(handleBackPress);
  useEffect(() => {
    handleBackPressRef.current = handleBackPress;
  }, [handleBackPress]);

  // 음성 명령 핸들러 등록 + 볼륨키/재생 연결
  useEffect(() => {
    setCurrentScreenId("Player");

    // 볼륨키 모드: 재생/일시정지
    setMode("playpause");

    // 2번: 재생/정지 토글
    registerPlayPause(ttsActions.togglePlayPause);
    // 3번: 재생 / 일시정지 직접 호출용
    registerTTSPlay(ttsActions.play);
    registerTTSPause(ttsActions.pause);

    registerVoiceHandlers("Player", {
      // 전역 명령 (섹션 단위 이동)
      playPause: ttsActions.togglePlayPause,
      next: ttsActions.playNext,
      prev: ttsActions.playPrevious,
      openQuestion: () => handleQuestionPressRef.current(),
      goBack: () => handleBackPressRef.current(),
      // Player 전용 rawText 명령 (챕터 이동 포함)
      rawText: (text: string) => handlePlayerVoiceRawRef.current(text),
    });

    return () => {
      console.log("[PlayerScreen] useEffect cleanup 시작");
      registerPlayPause(null);
      registerTTSPlay(null);
      registerTTSPause(null);
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
    registerTTSPlay,
    registerTTSPause,
    registerVoiceHandlers,
    ttsActions.togglePlayPause,
    ttsActions.playNext,
    ttsActions.playPrevious,
    ttsActions.play,
    ttsActions.pause,
  ]);


  // 챕터 검증
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

  const isLastSection = currentSectionIndex === chapter.sections.length - 1;

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
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

        {/* 콘텐츠 영역 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: controlsHeight + 20 },
          ]}
        >
          <View ref={contentRef} style={styles.contentBox} accessible={false}>
            <SectionRenderer section={currentSection} />
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
            style={styles.controlButtonPlay}
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
                handleChapterComplete();
              } else {
                ttsActions.playNext();
              }
            }}
            accessible
            accessibilityLabel={isLastSection ? "학습 완료" : "다음 섹션"}
            accessibilityRole="button"
            accessibilityHint={
              isLastSection
                ? hasNextChapter
                  ? "챕터 학습을 완료하고 다음 챕터로 이동합니다"
                  : "모든 학습을 완료하고 교재 목록으로 돌아갑니다"
                : ""
            }
          >
            <Text
              style={
                isLastSection
                  ? styles.controlButtonCompleteText
                  : styles.controlButtonText
              }
            >
              {isLastSection ? "완료" : "다음 →"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 하단: 질문하기 버튼 */}
        <View style={styles.bottomButtons}>
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
        </View>
      </SafeAreaView>

      {/* 설정 모달 */}
      <PlayerSettingsModal
        visible={modalVisible}
        currentPlayMode={playMode}
        onPlayModeChange={handlePlayModeChange}
        onClose={handleCloseModal}
      />
    </>
  );
}
const CONTROL_BTN_MIN_HEIGHT = 80;

const createStyles = (colors: any, fontSize: (size: number) => number) => {
  const isPrimaryColors = 'primary' in colors;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },

    header: {
      paddingHorizontal: 0,
      paddingTop: 12,
      paddingBottom: 12,
    },

    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },

    contentBox: {
      padding: 0,
      marginBottom: 20,
    },

    counterText: {
      fontSize: 22,
      color: colors.text.tertiary || colors.text.secondary,
      textAlign: "center",
      fontWeight: "700",
      marginBottom: 16,
    },

    controls: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 18,
      paddingHorizontal: 12,
      borderTopWidth: 3,
      borderTopColor: isPrimaryColors ? colors.border.main : colors.border.default,
      backgroundColor: colors.background.elevated || colors.background.default,
      gap: 8,
    },

    controlButtonPrevNext: {
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      flex: 1,
      minWidth: 100,
      maxWidth: 110,
      minHeight: CONTROL_BTN_MIN_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: isPrimaryColors ? colors.primary.dark : colors.border.focus,
    },
    controlButtonText: {
      fontSize: 22,
      fontWeight: "bold",
      color: isPrimaryColors ? colors.text.inverse : colors.text.primary,
    },

    controlButtonComplete: {
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor: isPrimaryColors ? colors.secondary.main : colors.accent.secondary,
      flex: 1,
      maxWidth: 110,
      minHeight: CONTROL_BTN_MIN_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: isPrimaryColors ? colors.secondary.dark : colors.border.focus,
    },
    controlButtonCompleteText: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text.primary,
    },

    controlButtonPlay: {
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor: colors.status.success,
      flex: 1,
      maxWidth: 140,
      minHeight: CONTROL_BTN_MIN_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.status.success,
    },
    playButtonText: {
      fontSize: 22,
      fontWeight: "900",
      color: isPrimaryColors ? colors.text.inverse : colors.text.primary,
    },

    disabledButton: {
      backgroundColor: isPrimaryColors ? colors.border.main : colors.border.default,
      borderColor: isPrimaryColors ? colors.border.main : colors.border.default,
      opacity: 0.6,
    },

    bottomButtons: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 16,
    },

    askButton: {
      backgroundColor: isPrimaryColors ? colors.secondary.main : colors.accent.secondary,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 20,
      minHeight: 68,
      justifyContent: "center",
      borderWidth: 3,
      borderColor: isPrimaryColors ? colors.secondary.dark : colors.border.focus,
      alignItems: "center",
    },
    askButtonText: {
      fontSize: fontSize(26),
      fontWeight: "bold",
      color: colors.text.primary,
    },

    errorText: {
      fontSize: fontSize(22),
      color: colors.text.tertiary || colors.text.secondary,
      textAlign: "center",
      marginTop: 40,
    },
  });
};
