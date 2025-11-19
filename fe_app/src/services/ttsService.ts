import Tts from 'react-native-tts';
import { Section } from '../types/chapter';
import { PlayMode } from '../types/playMode';
import { Platform } from 'react-native';

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'stopped';

export interface PauseSettings {
  heading: number;
  paragraph: number;
  list: number;
  formula: number;
  imageDescription: number;
  default: number;
}

export interface SyncOptions {
  rate: number;
  pitch: number;
  volume: number;
  voiceId: string | null;
}

export interface TTSOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  voice?: string;
  pauseSettings?: Partial<PauseSettings>;
  playMode?: PlayMode;
  repeatCount?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  onBoundary?: (event: { charIndex: number; charLength: number }) => void;
  onSectionChange?: (index: number) => void;
  onSectionComplete?: () => void;
}

class TTSService {
  private currentSectionIndex: number = 0;
  private sections: Section[] = [];
  private status: TTSStatus = 'idle';
  private options: TTSOptions = {};
  private playMode: PlayMode = 'single';
  private currentRepeatCount: number = 0;
  private targetRepeatCount: number = 2;

  private speakToken: number = 0;
  private pauseAfterTimer: ReturnType<typeof setTimeout> | null = null;

  private isTtsInitialized: boolean = false;

  private defaultPauseSettings: PauseSettings = {
    heading: 1500,
    paragraph: 800,
    list: 2500,
    formula: 1200,
    imageDescription: 1000,
    default: 500,
  };

  private srDelayMs = 0;

  private retryCount = 0;
  private readonly maxRetry = 2;

  constructor() {
    this.setupTtsListeners();
    this.initializeTtsEngine();
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private setupTtsListeners() {
    Tts.addEventListener('tts-start', () => {
      this.status = 'playing';
    });

    Tts.addEventListener('tts-finish', () => {
      this.options.onSectionComplete?.();
      this.status = 'idle';
    });

    // 오류 시 voice fallback + 재시도
    Tts.addEventListener('tts-error', async (event) => {
      console.error('[TTS-Engine] tts-error:', event);
      this.status = 'idle';

      if (this.retryCount < this.maxRetry) {
        this.retryCount++;
        await this.ensureVoiceFallback();
        await this.delay(300 + 200 * this.retryCount);

        try {
          await this.stop();
          await this.delay(100);
          await this.play();
          return;
        } catch (e) {
          console.warn('[TTS] Retry failed:', e);
        }
      }

      this.options.onError?.(
        new Error((event as any)?.message || 'TTS Engine Error')
      );
    });
  }

  private async initializeTtsEngine() {
    try {
      if (Platform.OS === 'android') {
        Tts.setDucking?.(false);
      }

      await Tts.getInitStatus();
      this.isTtsInitialized = true;

      const initialOptions = this.getOptions();
      await Tts.setDefaultLanguage(initialOptions.language || 'ko-KR');
      await Tts.setDefaultRate((initialOptions.rate || 1.0) / 2);
      await Tts.setDefaultPitch(initialOptions.pitch || 1.0);

      console.log('[TTS] Engine initialized');
    } catch (error) {
      console.error('[TTS] Engine init fail:', error);
      this.isTtsInitialized = false;
    }
  }

  async initialize(
    sections: Section[],
    startIndex: number = 0,
    options: TTSOptions = {}
  ): Promise<void> {
    console.log('[TTS] Initialize with', sections.length, 'sections');

    this.clearPauseAfterTimer();
    this.bumpSpeakToken();

    this.sections = sections;
    this.currentSectionIndex = startIndex;

    this.playMode = options.playMode || 'single';
    this.targetRepeatCount = options.repeatCount ?? 2;
    this.currentRepeatCount = 0;

    this.options = {
      language: 'ko-KR',
      pitch: options.pitch || 1.0,
      rate: options.rate || 1.0,
      volume: 1.0,
      pauseSettings: { ...this.defaultPauseSettings },
      ...options,
    };

    this.status = 'idle';
    this.retryCount = 0;

    if (this.isTtsInitialized) {
      await this.applyTtsOptions(this.options);
    }

    console.log('[TTS] Initialize done. playMode=', this.playMode);
  }
  /** TalkBack 안내 대기 */
  public setScreenReaderLeadDelay(ms: number) {
    this.srDelayMs = Math.max(0, ms | 0);
  }

  async syncWithSettings(settings: SyncOptions): Promise<void> {
    console.log('[TTS] Sync with settings:', settings);

    this.options.rate = settings.rate;
    this.options.pitch = settings.pitch;
    this.options.volume = settings.volume;

    if (settings.voiceId) {
      this.options.voice = settings.voiceId;
    }

    if (this.isTtsInitialized) {
      await this.applyTtsOptions(this.options);
    }
  }

  private async applyTtsOptions(options: TTSOptions) {
    try {
      if (options.language) {
        await Tts.setDefaultLanguage(options.language);
      }

      // 3.0배 이상 속도에서는 pitch를 함께 조절하여 체감 속도 향상
      if (options.rate !== undefined) {
        const engineRate = Math.min(options.rate, 3.0);
        await Tts.setDefaultRate(engineRate / 2);
      }

      if (options.pitch !== undefined) {
        let finalPitch = options.pitch;
        if ((options.rate ?? 1.0) > 3.0) {
          // 3.0배를 초과하는 속도에 대해 pitch를 추가로 높여 체감 속도 증가
          // (rate - 3.0) 구간을 0.0 ~ 9.0 으로 보고, pitch 증가분을 0.0 ~ 0.5 로 매핑
          const pitchBoost = ((options.rate ?? 1.0) - 3.0) / 18.0; // (12.0 - 3.0) / 18.0 = 0.5
          finalPitch += pitchBoost;
        }
        await Tts.setDefaultPitch(finalPitch);
      }

      if (options.voice) {
        await this.validateAndSetVoice(options.voice);
      }
    } catch (e) {
      console.warn('[TTS] applyTtsOptions failed:', e);
    }
  }

  private bumpSpeakToken() {
    this.speakToken++;
  }

  private clearPauseAfterTimer() {
    if (this.pauseAfterTimer) {
      clearTimeout(this.pauseAfterTimer);
      this.pauseAfterTimer = null;
    }
  }

  private getPauseTime(sectionType: Section['type']): number {
    const settings = this.options.pauseSettings || this.defaultPauseSettings;
    const rate = this.options.rate || 1.0;

    let basePause: number;
    switch (sectionType) {
      case 'heading':
        basePause = settings.heading ?? this.defaultPauseSettings.heading;
        break;
      case 'paragraph':
        basePause = settings.paragraph ?? this.defaultPauseSettings.paragraph;
        break;

      case 'list':
        basePause = settings.paragraph ?? this.defaultPauseSettings.paragraph;
        break;

      // case 'formula':
      //   basePause = settings.formula ?? this.defaultPauseSettings.formula;
      //   break;
      // case 'image_description':
      //   basePause =
      //     settings.imageDescription ??
      //     this.defaultPauseSettings.imageDescription;
      //   break;
      default:
        basePause = settings.default ?? this.defaultPauseSettings.default;
    }

    return Math.round(basePause / rate);
  }

  /** -----------------------------
   * 🔊 Play
   * ----------------------------- */
  async play(): Promise<void> {
    if (this.sections.length === 0) {
      console.warn('[TTS] No sections to play');
      return;
    }

    if (!this.isTtsInitialized) {
      console.warn('[TTS] Engine not ready');
      return;
    }

    if (this.currentSectionIndex >= this.sections.length) {
      this.status = 'stopped';
      return;
    }

    const currentSection = this.sections[this.currentSectionIndex];
    this.status = 'playing';

    console.log('[TTS] ▶ Play section', this.currentSectionIndex, currentSection);

    const pauseAfter = this.getPauseTime(currentSection.type);
    const myToken = ++this.speakToken;

    try {
      await this.speakCurrent(currentSection.text);

      this.options.onStart?.();

      await this.waitForTtsFinish(myToken, pauseAfter);
    } catch (error) {
      console.error('[TTS] speakCurrent error:', error);
      this.status = 'idle';
      this.options.onError?.(error as Error);
    }
  }

  /** -----------------------------
   * 🔊 speakCurrent
   * react-native-tts 옵션 타입 오류 해결됨
   * ----------------------------- */
  private async speakCurrent(text: string): Promise<void> {
    await Tts.stop().catch(() => {});
    await this.delay(60);

    await this.applyTtsOptions(this.options);

    const userRate = this.options.rate ?? 1.0;
    const volume = this.options.volume ?? 1.0;
    const userPitch = this.options.pitch ?? 1.0;

    // 실제 엔진에 전달할 값 계산
    const engineRate = Math.min(userRate, 3.0);
    let enginePitch = userPitch;
    if (userRate > 3.0) {
      const pitchBoost = (userRate - 3.0) / 18.0;
      enginePitch += pitchBoost;
    }

    // speak() 전에 pitch를 전역으로 설정
    await Tts.setDefaultPitch(enginePitch);

    /** 🔥 TypeScript 오류 해결:
     * react-native-tts의 speak 옵션은 다음 필드 필요:
     *  - iosVoiceId: string
     *  - rate: number
     *  - androidParams: { KEY_PARAM_STREAM?: string ... }
     */
    await Tts.speak(text, {
      iosVoiceId: this.options.voice || "",
      rate: engineRate / 2,
      androidParams: {
        KEY_PARAM_STREAM: "STREAM_MUSIC",
        KEY_PARAM_VOLUME: volume,
        KEY_PARAM_PAN: 0,
      },
    });

    console.log('[TTS] speak() OK');
  }

  /** -----------------------------
   * waitForTtsFinish
   * ----------------------------- */
  private async waitForTtsFinish(
    token: number,
    pauseAfter: number
  ): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        let finishSubscription: any = null;
        let errorSubscription: any = null;

        const finishListener = () => {
          if (finishSubscription) {
            finishSubscription.remove();
            finishSubscription = null;
          }
          if (errorSubscription) {
            errorSubscription.remove();
            errorSubscription = null;
          }
          resolve();
        };

        const errorListener = (err: any) => {
          if (finishSubscription) {
            finishSubscription.remove();
            finishSubscription = null;
          }
          if (errorSubscription) {
            errorSubscription.remove();
            errorSubscription = null;
          }
          reject(new Error(err?.message || "TTS Error"));
        };

        finishSubscription = Tts.addEventListener('tts-finish', finishListener);
        errorSubscription = Tts.addEventListener('tts-error', errorListener);
      });

      if (this.speakToken !== token) return;

      console.log('[TTS] ✓ section done');

      this.clearPauseAfterTimer();

      if (pauseAfter > 0) {
        this.pauseAfterTimer = setTimeout(() => {
          if (this.speakToken !== token) return;
          this.handleDone();
        }, pauseAfter);
      } else {
        this.handleDone();
      }
    } catch (err) {
      if (this.speakToken !== token) return;
      console.error('[TTS] ✗ waitForFinish error:', err);
      this.status = 'idle';
      this.options.onError?.(err as Error);
    }
  }

  /** -----------------------------
   * section 완료 처리
   * ----------------------------- */
  private handleDone(): void {
    switch (this.playMode) {
      case 'single':
        this.status = 'idle';
        this.options.onSectionComplete?.();
        break;

      case 'repeat':
        this.currentRepeatCount++;
        if (this.currentRepeatCount < this.targetRepeatCount) {
          this.play();
        } else {
          this.currentRepeatCount = 0;
          this.moveToNextSection();
        }
        break;

      case 'continuous':
      default:
        this.moveToNextSection();
        break;
    }
  }

  private moveToNextSection(): void {
    if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      this.options.onSectionChange?.(this.currentSectionIndex);
      this.play();
    } else {
      this.status = 'idle';
      this.options.onDone?.();
    }
  }
  /** -----------------------------
   * Pause / Resume / Stop
   * ----------------------------- */
  async pause(): Promise<void> {
    if (this.status === 'playing') {
      this.clearPauseAfterTimer();
      try {
        await Tts.stop();
        this.status = 'paused';
        console.log('[TTS] Paused');
      } catch (err) {
        console.warn('[TTS] Pause failed:', err);
        this.status = 'paused';
      }
    }
  }

  async resume(): Promise<void> {
    if (this.status === 'paused') {
      try {
        console.log('[TTS] Resuming');
        await this.play();
      } catch (err) {
        console.warn('[TTS] Resume failed:', err);
      }
    }
  }

  async stop(): Promise<void> {
    this.clearPauseAfterTimer();
    this.bumpSpeakToken();

    try {
      await Tts.stop();
    } catch (e) {
      console.warn('[TTS] Stop failed:', e);
    }

    this.status = 'stopped';
    this.currentRepeatCount = 0;

    console.log('[TTS] Stopped');
  }

  /** -----------------------------
   * goToSection / previous / next
   * ----------------------------- */
  async goToSection(index: number, autoPlay: boolean = false): Promise<void> {
    if (index < 0 || index >= this.sections.length) {
      console.warn('[TTS] Invalid section index:', index);
      return;
    }

    await this.stop();
    this.currentSectionIndex = index;
    this.currentRepeatCount = 0;

    this.options.onSectionChange?.(index);

    if (autoPlay) {
      await this.play();
    }
  }

  async previous(): Promise<void> {
    if (this.currentSectionIndex > 0) {
      await this.goToSection(this.currentSectionIndex - 1, true);
    }
  }

  async next(): Promise<void> {
    if (this.currentSectionIndex < this.sections.length - 1) {
      await this.goToSection(this.currentSectionIndex + 1, true);
    }
  }

  /** -----------------------------
   * updateAndReplay
   * (속도·볼륨·피치·보이스 변경 시 반영)
   * ----------------------------- */
  private async updateAndReplay(callback: () => void): Promise<void> {
    if (!this.isTtsInitialized) {
      console.warn('[TTS] Engine not ready, update skipped');
      callback();
      return;
    }

    const wasPlaying = this.status === 'playing';
    const prevIndex = this.currentSectionIndex;

    this.clearPauseAfterTimer();
    this.bumpSpeakToken();

    await Tts.stop().catch(() => {});
    this.status = 'idle';

    callback();
    await this.applyTtsOptions(this.options);

    this.currentSectionIndex = prevIndex;

    if (wasPlaying) {
      await this.play();
    } else {
      this.status = 'idle';
    }
  }

  /** -----------------------------
   * setRate / setPitch / setVolume
   * ----------------------------- */
  async setRate(rate: number): Promise<void> {
    console.log('[TTS] Set rate:', rate);
    await this.updateAndReplay(() => {
      this.options.rate = rate;
    });
  }

  async setPitch(pitch: number): Promise<void> {
    console.log('[TTS] Set pitch:', pitch);
    await this.updateAndReplay(() => {
      this.options.pitch = pitch;
    });
  }

  async setVolume(volume: number): Promise<void> {
    console.log('[TTS] Set volume:', volume);
    await this.updateAndReplay(() => {
      this.options.volume = volume;
    });
  }

  /** -----------------------------
   * setVoice
   * ----------------------------- */
  async setVoice(voice: string): Promise<void> {
    console.log('[TTS] Set voice:', voice);
    await this.updateAndReplay(() => {
      this.options.voice = voice;
    });
  }

  /** -----------------------------
   * setLanguage
   * ----------------------------- */
  setLanguage(lang: string): void {
    this.options.language = lang;
    console.log('[TTS] Set language:', lang);
  }

  /** -----------------------------
   * speakSample (설정 테스트용)
   * ----------------------------- */
  async speakSample(text: string): Promise<void> {
    if (!this.isTtsInitialized) {
      console.warn('[TTS] Engine not ready: sample skipped');
      return;
    }

    return new Promise(async (resolve, reject) => {
      let finishSubscription: any = null;
      let errorSubscription: any = null;

      try {
        await this.stop();
        await this.applyTtsOptions(this.options);

        // finish
        const finishListener = () => {
          if (finishSubscription) {
            finishSubscription.remove();
            finishSubscription = null;
          }
          if (errorSubscription) {
            errorSubscription.remove();
            errorSubscription = null;
          }
          resolve();
        };

        const errorListener = (evt: any) => {
          if (finishSubscription) {
            finishSubscription.remove();
            finishSubscription = null;
          }
          if (errorSubscription) {
            errorSubscription.remove();
            errorSubscription = null;
          }
          reject(evt);
        };

        finishSubscription = Tts.addEventListener('tts-finish', finishListener);
        errorSubscription = Tts.addEventListener('tts-error', errorListener);

        // speakSample에서도 pitch를 적용하기 위해 speak 전에 전역 설정
        const userRate = this.options.rate ?? 1.0;
        const userPitch = this.options.pitch ?? 1.0;

        // 실제 엔진에 전달할 값 계산
        let enginePitch = userPitch;
        if (userRate > 3.0) {
          const pitchBoost = (userRate - 3.0) / 18.0;
          enginePitch += pitchBoost;
        }

        // speak() 전에 pitch를 전역으로 설정
        await Tts.setDefaultPitch(enginePitch);

        await Tts.speak(text, {
          iosVoiceId: this.options.voice || '',
          rate: (this.options.rate || 1) / 2,
          androidParams: {
            KEY_PARAM_STREAM: 'STREAM_MUSIC',
            KEY_PARAM_VOLUME: this.options.volume || 1.0,
            KEY_PARAM_PAN: 0,
          },
        });
      } catch (error) {
        console.error('[TTS] Sample speak error:', error);
        if (finishSubscription) {
          finishSubscription.remove();
        }
        if (errorSubscription) {
          errorSubscription.remove();
        }
        reject(error);
      }
    });
  }

  /** -----------------------------
   * pauseSettings, playMode
   * ----------------------------- */
  setPauseSettings(settings: Partial<PauseSettings>) {
    this.options.pauseSettings = {
      ...this.defaultPauseSettings,
      ...this.options.pauseSettings,
      ...settings,
    };
  }

  setPlayMode(mode: PlayMode, repeatCount?: number) {
    this.playMode = mode;
    if (repeatCount !== undefined) {
      this.targetRepeatCount = repeatCount;
    }
    this.currentRepeatCount = 0;
    console.log('[TTS] PlayMode:', mode);
  }

  getPlayMode(): PlayMode {
    return this.playMode;
  }

  getStatus(): TTSStatus {
    return this.status;
  }

  getCurrentSectionIndex(): number {
    return this.currentSectionIndex;
  }

  getSections(): Section[] {
    return this.sections;
  }

  getOptions(): TTSOptions {
    return this.options;
  }
  /** -----------------------------
   * Voice 이름 정리
   * ----------------------------- */
  private getVoiceDisplayName(
    voiceId: string,
    voiceName: string,
    index: number
  ): string {
    console.log(`[TTS] Processing voice id=${voiceId}, name=${voiceName}`);

    // 삼성 TTS: SMTl01 / SMTm02...
    if (voiceId.includes('SMT')) {
      const match = voiceId.match(/SMT([lmh])(\d+)/);
      if (match) {
        const [, gender, num] = match;
        const genderName =
          gender === 'l'
            ? '여성'
            : gender === 'm'
            ? '남성'
            : gender === 'h'
            ? '고음'
            : '목소리';
        const padded = num.padStart(2, '0');
        return `${genderName} ${padded}`;
      }
    }

    // Google TTS 이름 가공
    if (voiceId.includes('Google') || voiceName.includes('Google')) {
      const g = voiceId.match(/(female|male|woman|man)[\s-]?(\d*)/i);
      if (g) {
        const [, gender, num] = g;
        const isFemale =
          gender.toLowerCase().includes('f') ||
          gender.toLowerCase().includes('w');

        if (num) {
          return `${isFemale ? '여성' : '남성'} ${num.padStart(2, '0')}`;
        }
        return `${isFemale ? '여성' : '남성'} ${String(index + 1).padStart(
          2,
          '0'
        )}`;
      }

      return `구글 ${String(index + 1).padStart(2, '0')}`;
    }

    return `목소리 ${String(index + 1).padStart(2, '0')}`;
  }

  /** -----------------------------
   * 사용 가능한 Voice 목록
   * ----------------------------- */
  async getAvailableVoices(): Promise<
    { id: string; name: string; language: string; quality: number; default?: boolean }[]
  > {
    try {
      if (!this.isTtsInitialized) {
        await this.initializeTtsEngine();
      }

      const voices = await Tts.voices();
      const ko = voices.filter((v) => v.language?.startsWith('ko'));

      console.log('[TTS] Korean voices:', ko.length);

      return ko.map((v, index) => ({
        id: v.id,
        name: this.getVoiceDisplayName(v.id, v.name, index),
        language: v.language,
        quality: v.quality,
        default: index === 0,
      }));
    } catch (err) {
      console.error('[TTS] getVoices error:', err);
      return [];
    }
  }

  /** -----------------------------
   * Voice validate & fallback
   * ----------------------------- */
  private async validateAndSetVoice(voiceId?: string) {
    if (!voiceId) return;

    try {
      const voices = await Tts.voices();
      const hit = voices.find(
        (v: any) => v.id === voiceId || v.name === voiceId
      );

      if (hit) {
        await Tts.setDefaultVoice(hit.id);
        return;
      }

      const ko = voices.find((v: any) =>
        (v.language || '').startsWith('ko')
      );
      if (ko?.id) {
        await Tts.setDefaultVoice(ko.id);
        this.options.voice = ko.id;
      }
    } catch (err) {
      console.warn('[TTS] validateAndSetVoice error:', err);
    }
  }

  private async ensureVoiceFallback() {
    try {
      const voices = await Tts.voices();
      const ko = voices.find((v) =>
        (v.language || '').startsWith('ko')
      );

      if (ko?.id) {
        await Tts.setDefaultVoice(ko.id);
        this.options.voice = ko.id;
      } else {
        this.options.voice = '';
      }
    } catch {
      this.options.voice = '';
    }
  }

  /** -----------------------------
   * 기타 Utility
   * ----------------------------- */
  async isSpeaking(): Promise<boolean> {
    return this.status === 'playing';
  }

  /** -----------------------------
   * cleanup
   * ----------------------------- */
  cleanup(): void {
    console.log('[TTS] Cleanup');

    this.clearPauseAfterTimer();
    this.bumpSpeakToken();

    Tts.stop().catch((err) => {
      console.warn('[TTS] Cleanup stop failed:', err);
    });

    this.sections = [];
    this.currentSectionIndex = 0;
    this.status = 'idle';

    this.options = {};
    this.currentRepeatCount = 0;
    this.playMode = 'single';
    this.retryCount = 0;

    console.log('[TTS] Cleanup done.');
  }
}

const ttsService = new TTSService();
export default ttsService;
