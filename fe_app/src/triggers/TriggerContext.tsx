import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
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

  /**
   * 인식된 원문 텍스트를 그대로 받아 처리하는 핸들러
   *  - 예: LibraryScreen에서 "영어 1", "문학" → 교재 매칭
   */
  rawText?: (spoken: string) => void;
};

type Ctx = {
  mode: TriggerMode;
  setMode: (m: TriggerMode) => void;

  registerPlayPause: (fn: (() => void) | null) => void;
  getPlayPause: () => (() => void) | null;

  currentScreenId: string;
  setCurrentScreenId: (id: string) => void;

  registerVoiceHandlers: (
    screenId: string,
    handlers: VoiceCommandHandlers
  ) => void;

  startVoiceCommandListening: () => Promise<void>;
  isVoiceCommandListening: boolean;
};

export const TriggerContext = createContext<Ctx>({
  mode: "voice",
  setMode: () => {},
  registerPlayPause: () => {},
  getPlayPause: () => null,
  currentScreenId: "",
  setCurrentScreenId: () => {},
  registerVoiceHandlers: () => {},
  startVoiceCommandListening: async () => {},
  isVoiceCommandListening: false,
});

// 전역 공통 명령 키
type VoiceCommandKey =
  | "playPause"
  | "next"
  | "prev"
  | "openQuestion"
  | "goBack"
  | "openQuiz";

// 간단한 한국어 → 명령 키 매핑
function parseVoiceCommand(raw: string): VoiceCommandKey | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;

  if (t.includes("뒤로") || t.includes("이전 화면")) return "goBack";
  if (t.includes("질문")) return "openQuestion";
  if (t.includes("퀴즈")) return "openQuiz";

  if (t.includes("다음") || t.includes("뒤로")) return "next";
  if (t.includes("이전") || t.includes("앞으로")) return "prev";

  if (t.includes("재생") || t.includes("일시정지") || t.includes("멈춰"))
    return "playPause";

  return null;
}

export function TriggerProvider({ children }: { children: React.ReactNode }) {
  // 재생/정지용 모드 & 핸들러
  const [mode, setMode] = useState<TriggerMode>("voice");
  const playPauseRef = useRef<(() => void) | null>(null);

  const registerPlayPause = useCallback((fn: (() => void) | null) => {
    playPauseRef.current = fn;
  }, []);

  const getPlayPause = useCallback(() => playPauseRef.current, []);

  // 전역 음성 명령 상태
  const [currentScreenId, setCurrentScreenId] = useState<string>("");
  const [isVoiceCommandListening, setIsVoiceCommandListening] =
    useState(false);

  const voiceHandlersRef = useRef<Record<string, VoiceCommandHandlers>>({});
  const asrOffRef = useRef<null | (() => void)>(null);

  const registerVoiceHandlers = useCallback(
    (screenId: string, handlers: VoiceCommandHandlers) => {
      voiceHandlersRef.current[screenId] = handlers;
    },
    []
  );

  const cleanupAsr = useCallback(() => {
    if (asrOffRef.current) {
      asrOffRef.current();
      asrOffRef.current = null;
    }
  }, []);

  const startVoiceCommandListening = useCallback(async () => {
    // 이미 인식 중이면 무시
    if (isVoiceCommandListening) return;

    // 이전 리스너 정리
    cleanupAsr();

    // STT 결과 구독
    asrOffRef.current = asrService.on((raw, isFinal) => {
      if (!isFinal) return;

      const text = (raw || "").trim();
      if (!text) return;

      // 한 번 결과 들어오면 바로 종료
      setIsVoiceCommandListening(false);
      asrService.stop().catch(() => {});
      cleanupAsr();

      const handlers =
        voiceHandlersRef.current[currentScreenId] || ({} as VoiceCommandHandlers);
      const key = parseVoiceCommand(text);

      if (!key) {
        // 전역 파서가 모르는 명령 → 현재 화면의 rawText 핸들러로 넘겨보기
        if (handlers.rawText) {
          console.log("[VoiceCommands] rawText 핸들러 호출:", text);
          handlers.rawText(text);
        } else {
          console.log("[VoiceCommands] 알 수 없는 명령:", text);
        }
        return;
      }

      const handler = handlers[key];

      if (handler) {
        console.log(
          "[VoiceCommands] 명령 실행:",
          key,
          "screen=",
          currentScreenId,
          "text=",
          text
        );
        try {
          handler();
        } catch (e) {
          console.warn("[VoiceCommands] 핸들러 실행 중 오류:", e);
        }
      } else {
        console.log(
          "[VoiceCommands] 현재 화면에서 처리할 수 없는 명령:",
          key,
          "screen=",
          currentScreenId,
          "text=",
          text
        );
      }
    });

    setIsVoiceCommandListening(true);

    try {
      await asrService.start({
        lang: "ko-KR",
        interimResults: false,
        continuous: false,
        autoRestart: false,
      });
    } catch (e) {
      console.warn("[VoiceCommands] asrService.start 실패:", e);
      setIsVoiceCommandListening(false);
      cleanupAsr();
    }
  }, [cleanupAsr, currentScreenId, isVoiceCommandListening]);

  // Provider 언마운트 시 ASR 정리
  useEffect(() => {
    return () => {
      cleanupAsr();
      asrService.abort();
    };
  }, [cleanupAsr]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      registerPlayPause,
      getPlayPause,
      currentScreenId,
      setCurrentScreenId,
      registerVoiceHandlers,
      startVoiceCommandListening,
      isVoiceCommandListening,
    }),
    [
      mode,
      registerPlayPause,
      getPlayPause,
      currentScreenId,
      registerVoiceHandlers,
      startVoiceCommandListening,
      isVoiceCommandListening,
    ]
  );

  return (
    <TriggerContext.Provider value={value}>{children}</TriggerContext.Provider>
  );
}
