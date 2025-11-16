import { useState, useEffect, useRef, useCallback } from "react";
import { AccessibilityInfo } from "react-native";
import ttsService from "../services/ttsService";
import { Chapter } from "../types/chapter";
import { PlayMode } from "../types/playMode";
import { AppSettings } from "../stores/appSettingsStore";
import * as Haptics from "expo-haptics";

interface TTSPlayerOptions {
  chapter: Chapter | null | undefined;
  initialSectionIndex?: number;
  initialPlayMode?: PlayMode;
  appSettings: AppSettings;
  onCompletion?: () => void;
  onSectionChange?: (index: number) => void;
}

export function useTTSPlayer({
  chapter,
  initialSectionIndex = 0,
  initialPlayMode = "single",
  appSettings,
  onCompletion,
  onSectionChange,
}: TTSPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] =
    useState(initialSectionIndex);
  const [playMode, setPlayMode] = useState<PlayMode>(initialPlayMode);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // TTS 실제 재생 상태와 UI 상태를 동기화하기 위한 폴링
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const actuallyPlaying = await ttsService.isSpeaking();
        if (actuallyPlaying !== isPlayingRef.current) {
          setIsPlaying(actuallyPlaying);
        }
      } catch (error) {
        // 에러 무시
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, []);

  // TTS 초기화 및 설정 동기화
  useEffect(() => {
    // 챕터 또는 섹션이 없으면 초기화하지 않고 경고만 남김
    if (!chapter || !chapter.sections || chapter.sections.length === 0) {
      console.warn("[useTTSPlayer] No sections found for this chapter.");
      return;
    }

    // 저장된 섹션 인덱스가 범위를 벗어날 경우 방어
    const maxIndex = chapter.sections.length - 1;
    const safeInitialIndex = Math.min(initialSectionIndex, maxIndex);

    // state도 안전한 인덱스로 맞춰주기
    setCurrentSectionIndex(safeInitialIndex);

    ttsService.initialize(chapter.sections, safeInitialIndex, {
      rate: appSettings.ttsRate,
      pitch: appSettings.ttsPitch,
      volume: appSettings.ttsVolume,
      voice: appSettings.ttsVoiceId || undefined,
      playMode: initialPlayMode,
      onStart: () => setIsPlaying(true),
      onDone: () => {
        setIsPlaying(false);
        const isLastSection =
          ttsService.getCurrentSectionIndex() === chapter.sections.length - 1;
        if (isLastSection) {
          onCompletion?.();
        }
      },
      onSectionChange: (newIndex) => {
        setCurrentSectionIndex(newIndex);
        onSectionChange?.(newIndex);
      },
      onError: (error) => {
        console.error("[useTTSPlayer] TTS Error:", error);
        setIsPlaying(false);
        AccessibilityInfo.announceForAccessibility(
          "음성 재생 중 오류가 발생했습니다."
        );
      },
    });

    // 컴포넌트 언마운트 시 TTS 정리
    return () => {
      ttsService.cleanup();
    };
  }, [chapter, initialSectionIndex, initialPlayMode, onCompletion, onSectionChange, appSettings.ttsRate, appSettings.ttsPitch, appSettings.ttsVolume, appSettings.ttsVoiceId]);

  // 재생 가능한 섹션이 있는지 공통 체크
  const hasPlayableSections = !!chapter &&
    Array.isArray(chapter.sections) &&
    chapter.sections.length > 0;

  // 재생 모드 변경 핸들러
  const changePlayMode = useCallback((newMode: PlayMode) => {
    setPlayMode(newMode);
    ttsService.setPlayMode(newMode);
  }, []);

  // 재생/일시정지 토글 (완전 수동형 + 섹션 체크)
  const togglePlayPause = useCallback(async () => {
    if (!hasPlayableSections) {
      AccessibilityInfo.announceForAccessibility("재생할 내용이 없습니다.");
      return;
    }

    Haptics.selectionAsync();
    const speaking = await ttsService.isSpeaking();
    if (speaking) {
      await ttsService.pause();
      setIsPlaying(false);
    } else {
      await ttsService.play();
      // play() 호출 후 실제 재생까지 시간이 걸릴 수 있어, 폴링에 상태 업데이트를 맡김
    }
  }, [hasPlayableSections]);

  // 이전 섹션
  const playPrevious = useCallback(async () => {
    if (!hasPlayableSections) {
      AccessibilityInfo.announceForAccessibility(
        "이전으로 이동할 수 있는 섹션이 없습니다."
      );
      return;
    }

    if (currentSectionIndex > 0) {
      Haptics.selectionAsync();
      const wasPlaying = await ttsService.isSpeaking();
      await ttsService.previous();
      if (wasPlaying) {
        await ttsService.play();
      }
    } else {
      AccessibilityInfo.announceForAccessibility("이전 섹션이 없습니다.");
    }
  }, [hasPlayableSections, currentSectionIndex]);

  // 다음 섹션
  const playNext = useCallback(async () => {
    if (!hasPlayableSections) {
      AccessibilityInfo.announceForAccessibility(
        "다음으로 이동할 수 있는 섹션이 없습니다."
      );
      return;
    }

    if (chapter && currentSectionIndex < chapter.sections.length - 1) {
      Haptics.selectionAsync();
      const wasPlaying = await ttsService.isSpeaking();
      await ttsService.next();
      if (wasPlaying) {
        await ttsService.play();
      }
    } else {
      AccessibilityInfo.announceForAccessibility("마지막 섹션입니다.");
    }
  }, [hasPlayableSections, chapter, currentSectionIndex]);

  // 외부에서 TTS를 제어해야 할 때 (예: 모달 열기)
  const pause = useCallback(async () => {
    if (await ttsService.isSpeaking()) {
      await ttsService.pause();
      setIsPlaying(false);
    }
  }, []);

  const play = useCallback(async () => {
    if (!hasPlayableSections) {
      AccessibilityInfo.announceForAccessibility("재생할 내용이 없습니다.");
      return;
    }

    if (!(await ttsService.isSpeaking())) {
      await ttsService.play();
    }
  }, [hasPlayableSections]);

  // 설정 변경 시 TTS에 즉시 반영
  useEffect(() => {
    ttsService.setRate(appSettings.ttsRate);
  }, [appSettings.ttsRate]);

  useEffect(() => {
    ttsService.setPitch(appSettings.ttsPitch);
  }, [appSettings.ttsPitch]);

  useEffect(() => {
    ttsService.setVolume(appSettings.ttsVolume);
  }, [appSettings.ttsVolume]);

  useEffect(() => {
    if (appSettings.ttsVoiceId) {
      ttsService.setVoice(appSettings.ttsVoiceId);
    }
  }, [appSettings.ttsVoiceId]);

  return {
    isPlaying,
    currentSectionIndex,
    playMode,
    actions: {
      togglePlayPause,
      playPrevious,
      playNext,
      changePlayMode,
      // ensureAutoPlay 제거: 완전 수동형
      pause,
      play,
    },
  };
}

export type TTSPlayerActions = ReturnType<typeof useTTSPlayer>["actions"];