import {
  ExpoSpeechRecognitionModule as ASR,
  type ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

export type ASRConfig = {
  lang?: string;            // 기본: 'ko-KR'
  interimResults?: boolean; // 중간 결과 수신 여부
  continuous?: boolean;     // 연속 인식 힌트
  autoRestart?: boolean;    // 엔진이 끊기면 자동 재시작할지
  maxSessionMs?: number;    // 한 세션 최대 길이 (안정성용)
};

export type Listener = (text: string, isFinal: boolean) => void;

class ASRService {
  private listeners = new Set<Listener>();
  private recognizing = false;
  private buffer = "";
  private sessionStartedAt = 0;
  private cfg: Required<ASRConfig>;
  private subs: { remove: () => void }[] = [];

  constructor() {
    this.cfg = {
      lang: "ko-KR",
      interimResults: true,
      continuous: true,
      autoRestart: true,
      maxSessionMs: 8 * 60 * 1000,
    };
  }

  /** 콜백 등록: (텍스트, isFinal) */
  on(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(text: string, isFinal: boolean) {
    for (const fn of this.listeners) {
      fn(text, isFinal);
    }
  }

  /** Expo 이벤트 리스너 붙이기 */
  private attachEvents() {
    this.detachEvents();

    const onResult = (e: ExpoSpeechRecognitionResultEvent) => {
      /**
       * 🔧 핵심 수정 포인트
       *
       * 이전 코드(추정):
       *   const text = (e.results?.map(r => r.transcript).join(" ") || "").trim();
       *   → "영어 1 영어 일 영어1" 처럼 여러 후보가 한 문자열로 합쳐졌음.
       *
       * 변경 코드:
       *   - 첫 번째 후보만 사용 (가장 신뢰도가 높은 결과)
       *   - trim() 해서 앞뒤 공백 제거
       */
      const best = e.results?.[0]?.transcript ?? "";
      const text = best.trim();
      if (!text) return;

      if (e.isFinal) {
        // 최종 결과는 buffer에 한 번만 합쳐서 전달
        this.buffer = (this.buffer + " " + text).trim();
        this.emit(this.buffer, true);
      } else {
        // 중간(preview) 결과
        const preview = (this.buffer + " " + text).trim();
        this.emit(preview, false);
      }
    };

    const onEnd = () => {
      if (!this.recognizing) return;

      const elapsed = Date.now() - this.sessionStartedAt;
      if (elapsed >= this.cfg.maxSessionMs) {
        // 너무 오래된 세션이면 buffer 초기화
        this.buffer = "";
        this.sessionStartedAt = Date.now();
      }

      // autoRestart가 켜져 있는 경우에만 재시작
      if (this.cfg.autoRestart) {
        ASR.start({
          lang: this.cfg.lang,
          interimResults: this.cfg.interimResults,
          continuous: this.cfg.continuous,
        });
      }
    };

    const onError = () => {
      if (!this.recognizing) return;
      if (this.cfg.autoRestart) {
        ASR.abort();
        ASR.start({
          lang: this.cfg.lang,
          interimResults: this.cfg.interimResults,
          continuous: this.cfg.continuous,
        });
      }
    };

    this.subs.push(
      ASR.addListener("result", onResult),
      ASR.addListener("end", onEnd),
      ASR.addListener("error", onError)
    );
  }

  /** 이벤트 리스너 제거 */
  private detachEvents() {
    this.subs.forEach((s) => s?.remove?.());
    this.subs = [];
  }

  /**
   * 음성 인식 시작
   *  - config로 옵션 덮어씌우기 가능
   */
  async start(config?: Partial<ASRConfig>) {
    if (this.recognizing) return;
    if (config) {
      this.cfg = { ...this.cfg, ...config };
    }

    const perm = await ASR.requestPermissionsAsync();
    if (!perm.granted) {
      throw new Error("마이크/음성 인식 권한이 필요합니다.");
    }

    this.buffer = "";
    this.sessionStartedAt = Date.now();
    this.attachEvents();

    await ASR.start({
      lang: this.cfg.lang,
      interimResults: this.cfg.interimResults,
      continuous: this.cfg.continuous,
    });

    this.recognizing = true;
  }

  /** 정상 종료 */
  async stop() {
    if (!this.recognizing) return;
    this.recognizing = false;
    try {
      await ASR.stop();
    } finally {
      this.detachEvents();
    }
  }

  /** 강제 중단 */
  abort() {
    this.recognizing = false;
    try {
      ASR.abort();
    } finally {
      this.detachEvents();
    }
  }

  isRecognizing() {
    return this.recognizing;
  }

  getBufferedText() {
    return this.buffer;
  }
}

export const asrService = new ASRService();
