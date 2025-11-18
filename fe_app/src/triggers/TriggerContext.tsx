import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { AccessibilityInfo } from "react-native";
import { asrService } from "../services/asrService";

// 볼륨키 모드
type TriggerMode = "voice" | "playpause";

// 화면별로 등록할 음성 명령 핸들러들
type VoiceCommandHandlers = {
  playPause?: () => void;
  next?: () => void;
  prev?: () => void;
  openQuestion?: () => void;
  goBack?: () => void;
  openQuiz?: () => void;
  openSettings?: () => void;

  /**
   * 인식된 원문 텍스트를 그대로 받아 처리하는 핸들러
   */
  rawText?: (spoken: string) => void;
};

// TriggerContext에 들어갈 타입
type Ctx = {
  mode: TriggerMode;
  setMode: (m: TriggerMode) => void;

  registerPlayPause: (fn: (() => void) | null) => void;
  getPlayPause: () => (() => void) | null;

  registerTTSPlay: (fn: (() => void) | null) => void;
  registerTTSPause: (fn: (() => void) | null) => void;
  getTTSPlayRef: () => (() => void) | null;
  getTTSPauseRef: () => (() => void) | null;

  currentScreenId: string;
  setCurrentScreenId: (id: string) => void;

  registerVoiceHandlers: (
    screenId: string,
    handlers: VoiceCommandHandlers
  ) => void;

  startVoiceCommandListening: () => Promise<void>;
  stopVoiceCommandListening: () => Promise<void>;
  isVoiceCommandListening: boolean;
};

export const TriggerContext = createContext<Ctx>({
  mode: "voice",
  setMode: () => {},

  registerPlayPause: () => {},
  getPlayPause: () => null,

  registerTTSPlay: () => {},
  registerTTSPause: () => {},
  getTTSPlayRef: () => null,
  getTTSPauseRef: () => null,

  currentScreenId: "",
  setCurrentScreenId: () => {},

  registerVoiceHandlers: () => {},

  startVoiceCommandListening: async () => {},
  stopVoiceCommandListening: async () => {},
  isVoiceCommandListening: false,
});

// 전역 공통 명령 키
type VoiceCommandKey =
  | "playPause"
  | "next"
  | "prev"
  | "openQuestion"
  | "goBack"
  | "openQuiz"
  | "openSettings";

// 간단한 한국어 → 명령 키 매핑
function parseVoiceCommand(raw: string): VoiceCommandKey | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;

  if (t.includes("뒤로") || t.includes("이전 화면") || t.includes("돌아가"))
    return "goBack";

  if (t === "설정" || t.includes("설정 열기") || t.includes("설정 화면"))
    return "openSettings";

  if (
    t === "질문" ||
    t === "질문하기" ||
    t.includes("질문 하기") ||
    t.includes("질문해줘")
  )
    return "openQuestion";

  if (t === "퀴즈" || t === "퀴즈 풀기" || t.includes("퀴즈 시작"))
    return "openQuiz";

  if (
    t.includes("다음 챕터") ||
    t.includes("다음장") ||
    (t === "다음" && !t.includes("질문"))
  )
    return "next";

  if (
    t.includes("이전 챕터") ||
    t.includes("앞장") ||
    (t === "이전" && !t.includes("화면"))
  )
    return "prev";

  if (
    t.includes("재생") ||
    t.includes("일시정지") ||
    t.includes("멈춰") ||
    t.includes("정지")
  )
    return "playPause";

  return null;
}

export function TriggerProvider({ children }: { children: React.ReactNode }) {
  // (1) 볼륨키 모드
  const [mode, setMode] = useState<TriggerMode>("voice");

  // (2) 재생/정지 토글용 핸들러 (기존)
  const playPauseRef = useRef<(() => void) | null>(null);
  const registerPlayPause = useCallback((fn: (() => void) | null) => {
    playPauseRef.current = fn;
  }, []);
  const getPlayPause = useCallback(() => playPauseRef.current, []);

  // (3) PlayerScreen 전용 재생 / 정지 핸들러 (신규)
  const ttsPlayRef = useRef<(() => void) | null>(null);
  const ttsPauseRef = useRef<(() => void) | null>(null);

  const registerTTSPlay = useCallback((fn: (() => void) | null) => {
    ttsPlayRef.current = fn;
  }, []);
  const registerTTSPause = useCallback((fn: (() => void) | null) => {
    ttsPauseRef.current = fn;
  }, []);

  const getTTSPlayRef = useCallback(() => ttsPlayRef.current, []);
  const getTTSPauseRef = useCallback(() => ttsPauseRef.current, []);

  // (4) 현재 화면 ID
  const [currentScreenId, setCurrentScreenId] = useState<string>("");

  // (5) VoiceCommand 핸들러
  const voiceHandlersRef = useRef<Record<string, VoiceCommandHandlers>>({});
  const registerVoiceHandlers = useCallback(
    (screenId: string, handlers: VoiceCommandHandlers) => {
      voiceHandlersRef.current[screenId] = handlers;
    },
    []
  );

  // (6) 음성 인식 상태/타이머
  const [isVoiceCommandListening, setIsVoiceCommandListening] = useState(false);
  const asrOffRef = useRef<null | (() => void)>(null);
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearVoiceTimeout = useCallback(() => {
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
  }, []);

  const cleanupAsr = useCallback(() => {
    if (asrOffRef.current) {
      asrOffRef.current();
      asrOffRef.current = null;
    }
  }, []);

  // (7) 음성 명령 종료
  const stopVoiceCommandListening = useCallback(async () => {
    clearVoiceTimeout();
    setIsVoiceCommandListening(false);
    cleanupAsr();
    try {
      await asrService.stop();
    } catch (e) {
      console.warn("[VoiceCommands] stopVoiceCommandListening 실패:", e);
    }
  }, [clearVoiceTimeout, cleanupAsr]);

  // (8) 음성 명령 시작
  const startVoiceCommandListening = useCallback(async () => {
    if (isVoiceCommandListening) return;

    clearVoiceTimeout();
    cleanupAsr();

    // STT 구독
    asrOffRef.current = asrService.on((raw, isFinal) => {
      if (!isFinal) return;

      const text = (raw || "").trim();
      if (!text) return;

      clearVoiceTimeout();
      setIsVoiceCommandListening(false);
      asrService.stop().catch(() => {});
      cleanupAsr();

      const handlers =
        voiceHandlersRef.current[currentScreenId] ||
        ({} as VoiceCommandHandlers);

      const key = parseVoiceCommand(text);

      // (A) 전역 명령 매칭
      if (key && handlers[key]) {
        console.log(
          "[VoiceCommands] 명령 실행:",
          key,
          "screen=",
          currentScreenId,
          "text=",
          text
        );
        try {
          handlers[key]!();
        } catch (e) {
          console.warn("[VoiceCommands] 핸들러 실행 오류:", e);
        }
        return;
      }

      // 2) 전역 명령어가 아니거나, 핸들러가 없으면 rawText 핸들러로 전달
      // (B) rawText 처리
      if (handlers.rawText) {
        console.log("[VoiceCommands] rawText 핸들러 호출:", text);
        try {
          handlers.rawText(text);
        } catch (e) {
          console.warn("[VoiceCommands] rawText 오류:", e);
        }
        return;
      }

      console.log(
        "[VoiceCommands] 처리 불가:",
        text,
        "screen=",
        currentScreenId,
        "parsed=",
        key
      );
    });

    setIsVoiceCommandListening(true);

    // 미인식 타임아웃
    voiceTimeoutRef.current = setTimeout(() => {
      console.log(
        "[VoiceCommands] 타임아웃: 음성 명령 미인식으로 자동 종료"
      );
      setIsVoiceCommandListening(false);
      asrService.stop().catch(() => {});
      cleanupAsr();
      AccessibilityInfo.announceForAccessibility(
        "음성 명령을 인식하지 못해 종료했습니다."
      );
    }, 6000); // 6초 정도 대기 (필요하면 숫자 조절 가능)

    try {
      await asrService.start({
        lang: "ko-KR",
        interimResults: false,
        continuous: false,
        autoRestart: false,
      });
    } catch (e) {
      console.warn("[VoiceCommands] asrService.start 실패:", e);
      clearVoiceTimeout();
      setIsVoiceCommandListening(false);
      cleanupAsr();
    }
  }, [
    isVoiceCommandListening,
    clearVoiceTimeout,
    cleanupAsr,
    currentScreenId,
  ]);

  // Provider 언마운트 시 정리
  useEffect(() => {
    return () => {
      clearVoiceTimeout();
      cleanupAsr();
      asrService.abort();
    };
  }, [clearVoiceTimeout, cleanupAsr]);

  const value = useMemo(
    () => ({
      mode,
      setMode,

      registerPlayPause,
      getPlayPause,

      registerTTSPlay,
      registerTTSPause,
      getTTSPlayRef,
      getTTSPauseRef,

      currentScreenId,
      setCurrentScreenId,

      registerVoiceHandlers,

      startVoiceCommandListening,
      stopVoiceCommandListening,
      isVoiceCommandListening,
    }),
    [
      mode,
      registerPlayPause,
      getPlayPause,
      registerTTSPlay,
      registerTTSPause,
      getTTSPlayRef,
      getTTSPauseRef,
      currentScreenId,
      registerVoiceHandlers,
      startVoiceCommandListening,
      stopVoiceCommandListening,
      isVoiceCommandListening,
    ]
  );

  return (
    <TriggerContext.Provider value={value}>
      {children}
    </TriggerContext.Provider>
  );
}
