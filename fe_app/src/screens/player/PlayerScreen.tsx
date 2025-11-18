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
import ChapterCompletionModal from "../../components/ChapterCompletionModal";
import { useTTSPlayer } from "../../hooks/useTTSPlayer";
import PlayerHeader from "../../components/PlayerHeader";
import { buildChaptersFromMaterialJson } from "../../utils/materialJsonMapper";
import type { Chapter } from "../../types/chapter";
import {
  toggleBookmark,
  fetchBookmarksByMaterial,
} from "../../api/bookmarkApi";
import { updateProgress } from "../../api/progressApi";
import { COLORS } from "../../constants/colors";

type PlayModeKey = "single" | "continuous" | "repeat";

const UI_MODE_LABELS: Record<PlayModeKey, string> = {
  continuous: "연속",
  repeat: "반복",
  single: "한 섹션씩",
};

export default function PlayerScreen() {
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const route = useRoute<PlayerScreenRouteProp>() as any;

  const {
    material,
    chapterId,
    fromStart,
    initialSectionIndex: initialSectionIndexFromRoute,
  } = route.params;

  const appSettings = useAppSettingsStore((state) => state.settings);
  const [isChapterCompleted, setIsChapterCompleted] = useState(false);

  // 서버 북마크 상태 (이 챕터가 서버 북마크 되어 있는지)
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

  // Modal 상태
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

  // 현재 챕터 찾기 (없으면 첫 챕터라도 사용)
  const chapter: Chapter | null = useMemo(() => {
    console.log("[PlayerScreen] 챕터 찾기 시작");
    console.log(
      "[PlayerScreen] chaptersFromJson.length:",
      chaptersFromJson.length
    );
    console.log(
      "[PlayerScreen] route.params.chapterId:",
      chapterId,
      typeof chapterId
    );

    if (chaptersFromJson.length === 0) {
      console.log("[PlayerScreen] ❌ chaptersFromJson이 비어있음");
      return null;
    }

    // 모든 챕터의 chapterId 출력
    console.log(
      "[PlayerScreen] 사용 가능한 chapterIds:",
      chaptersFromJson
        .map((c) => `${c.chapterId}(${typeof c.chapterId})`)
        .join(", ")
    );

    // chapterId를 명시적으로 number로 변환
    const targetChapterId =
      typeof chapterId === "string" ? Number(chapterId) : chapterId;

    console.log(
      "[PlayerScreen] targetChapterId:",
      targetChapterId,
      typeof targetChapterId
    );

    const found = chaptersFromJson.find((c) => c.chapterId === targetChapterId);

    if (found) {
      console.log("[PlayerScreen] ✅ 챕터 찾음:", found.title);
    } else {
      console.log("[PlayerScreen] ⚠️ 챕터 못 찾음, 첫 번째 챕터 사용");
    }

    return found ?? chaptersFromJson[0];
  }, [chaptersFromJson, chapterId]);

  // 현재 챕터 인덱스 & 이전/다음 챕터 존재 여부
  const currentChapterIndex = useMemo(() => {
    if (!chapter) return -1;
    const index = chaptersFromJson.findIndex(
      (c) => c.chapterId === chapter.chapterId
    );
    console.log("[PlayerScreen] currentChapterIndex:", index);
    return index;
  }, [chaptersFromJson, chapter]);

  const hasPrevChapter = currentChapterIndex > 0 && currentChapterIndex !== -1;
  const hasNextChapter =
    currentChapterIndex !== -1 &&
    currentChapterIndex < chaptersFromJson.length - 1;

  console.log(
    "[PlayerScreen] hasPrevChapter:",
    hasPrevChapter,
    "hasNextChapter:",
    hasNextChapter
  );

  // 서버에서 현재 챕터 북마크 상태 초기 로드
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
        console.error("[PlayerScreen] 서버 북마크 상태 조회 실패:", e);
        // 실패해도 UI는 기본값(미저장)으로 두고 넘어간다
      }
    };

    loadBookmarkState();

    return () => {
      cancelled = true;
    };
  }, [material.id, chapterId]);

  // 퀴즈는 일단 미사용
  const hasQuiz = false;

  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // TTS 상태 ref (saveProgressData에서 참조)
  const ttsStateRef = useRef<{
    currentSectionIndex: number;
    playMode: PlayMode;
  }>({ currentSectionIndex: 0, playMode: "single" });

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

  // 저장된 위치 + BookmarkList에서 오는 initialSectionIndex 처리
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

  // saveProgressData에서 최신 상태를 참조하기 위한 ref
  useEffect(() => {
    ttsStateRef.current = { currentSectionIndex, playMode };
  }, [currentSectionIndex, playMode]);

  // 백엔드에 진행률 업데이트 (API 호출)
  const updateProgressToBackend = useCallback(async () => {
    if (!chapter) return;

    const currentPage = currentSectionIndex + 1; // 1부터 시작
    const totalPages = chapter.sections.length;

    try {
      const response = await updateProgress({
        materialId: material.id,
        currentPage,
        totalPages,
      });
      console.log("[PlayerScreen] 진행률 업데이트 성공:", response.data);
    } catch (error) {
      console.error("[PlayerScreen] 진행률 업데이트 실패:", error);
      // 에러가 발생해도 사용자 경험을 방해하지 않도록 조용히 처리
    }
  }, [material.id, chapter, currentSectionIndex]);

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

  // 화면 이탈 시 진행 상황 저장
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async () => {
      console.log("[PlayerScreen] 화면 이탈 감지 - TTS 정지");
      saveProgressData(false);
      // 백엔드에 진행률 업데이트
      await updateProgressToBackend();
    });

    return unsubscribe;
  }, [navigation, saveProgressData, updateProgressToBackend]);

  // 질문하기
  const handleQuestionPress = useCallback(async () => {
    await ttsActions.pause();
    // 백엔드에 진행률 업데이트
    await updateProgressToBackend();

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
  }, [
    navigation,
    material,
    chapterId,
    currentSectionIndex,
    ttsActions,
    updateProgressToBackend,
  ]);

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

  // 북마크 토글 (서버 API 사용)
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
        "서버와 통신 중 오류가 발생하여 저장 상태를 변경하지 못했습니다"
      );
    }
  }, [chapter, chapterId, material.id, bookmarked]);

  // 🔁 이전/다음 챕터로 이동
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

      // 현재 진행 상황 저장 + 재생 일시정지
      saveProgressData(false);
      ttsActions.pause();
      // 백엔드에 진행률 업데이트
      await updateProgressToBackend();

      AccessibilityInfo.announceForAccessibility(
        direction === "prev"
          ? `이전 챕터로 이동합니다. ${targetChapter.title}`
          : `다음 챕터로 이동합니다. ${targetChapter.title}`
      );

      // 현재 PlayerScreen을 다음 챕터로 교체
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

  const handlePrevChapter = useCallback(() => {
    handleMoveChapter("prev");
  }, [handleMoveChapter]);

  const handleNextChapter = useCallback(() => {
    handleMoveChapter("next");
  }, [handleMoveChapter]);

  // 뒤로가기
  const handleBackPress = useCallback(async () => {
    saveProgressData(false);
    // 백엔드에 진행률 업데이트
    await updateProgressToBackend();
    navigation.goBack();
  }, [navigation, saveProgressData, updateProgressToBackend]);

  // 챕터 완료 후 퀴즈 이동 (지금은 사용 X)
  const handleQuizNavigation = useCallback(() => {
    AccessibilityInfo.announceForAccessibility(
      "퀴즈 기능이 아직 준비 중입니다."
    );
  }, []);

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
      openQuiz: hasQuiz ? handleQuizNavigation : undefined,
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
    hasQuiz,
    handleQuizNavigation,
  ]);

  // 화면 진입 시 음성 안내
  useEffect(() => {
    const msg =
      "교재 듣기 화면입니다. 상단의 음성 명령 버튼을 두 번 탭한 후, 재생, 일시정지, 다음, 이전, 질문하기, 저장하기, 설정 열기, 하나씩 모드, 연속 모드, 반복 모드, 다음 챕터, 이전 챕터, 뒤로 가기처럼 말하면 해당 기능이 실행됩니다.";
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
        <Text style={styles.errorText}>섹션를 불러올 수 없습니다.</Text>
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
            accessible={false}
          >
            <Text style={styles.contentText}>{currentSection.text}</Text>
          </View>

          <Text style={styles.counterText}>
            {currentSectionIndex + 1} / {chapter.sections.length}
          </Text>
        </ScrollView>

        {/* 재생 컨트롤 (섹션 단위) */}
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
            accessibilityHint={isLastSection ? "챕터 학습을 완료합니다" : ""}
          >
            <Text style={isLastSection ? styles.controlButtonCompleteText : styles.controlButtonText}>
              {isLastSection ? "완료" : "다음 →"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 하단 액션 버튼들 */}
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
  container: { flex: 1, backgroundColor: COLORS.background.default },

  header: {
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 12,
    // borderBottomWidth: 3,
    // borderBottomColor: COLORS.border.light,
  },

  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  contentBox: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: COLORS.background.paper,
    borderWidth: 2,
    borderColor: COLORS.border.light,
  },
  contentText: {
    fontSize: 30,
    lineHeight: 48,
    color: COLORS.text.primary,
    fontWeight: "600",
  },
  counterText: {
    fontSize: 22,
    color: COLORS.text.tertiary,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 16,
  },

  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderTopWidth: 3,
    borderTopColor: COLORS.border.main,
    backgroundColor: COLORS.background.elevated,
    gap: 12,
  },

  controlButtonPrevNext: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: COLORS.primary.main, // 남색
    minWidth: 100,
    minHeight: CONTROL_BTN_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.primary.dark,
  },
  controlButtonText: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text.inverse,
  },

  controlButtonComplete: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: COLORS.secondary.main, // 노란색
    minWidth: 100,
    minHeight: CONTROL_BTN_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.secondary.dark,
  },
  controlButtonCompleteText: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text.primary, // 검은색 (노란 배경)
  },
  controlButtonPlay: {
    paddingVertical: 18,
    paddingHorizontal: 26,
    borderRadius: 14,
    backgroundColor: COLORS.status.success, // 초록색
    minWidth: 140,
    minHeight: CONTROL_BTN_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.status.success,
  },
  playButtonText: { fontSize: 24, fontWeight: "900", color: COLORS.text.inverse },

  disabledButton: {
    backgroundColor: COLORS.gray[400],
    borderColor: COLORS.gray[500],
    opacity: 0.6,
  },

  bottomButtons: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  askButton: {
    backgroundColor: COLORS.secondary.main, // 노란색
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 68,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.secondary.dark,
    alignItems: "center",
  },
  askButtonText: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.text.primary,
  },

  errorText: {
    fontSize: 22,
    color: COLORS.text.tertiary,
    textAlign: "center",
    marginTop: 40,
  },
});
