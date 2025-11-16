import Tts from 'react-native-tts';
import { Section } from '../types/chapter';
import { PlayMode } from '../types/playMode';
import { Platform } from 'react-native';

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'stopped';

export interface PauseSettings {
  heading: number;
  paragraph: number;
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
    formula: 1200,
    imageDescription: 1000,
    default: 500,
  };

  // (TalkBack 대기를 TTS 내부에서 처리하지 않으므로,
  //  필요 시 화면 레벨에서만 delay를 줄 것)
  private srDelayMs = 0;

  // 오류 재시도 컨트롤
  private retryCount = 0;
  private readonly maxRetry = 2;

  constructor() {
    this.setupTtsListeners();
    this.initializeTtsEngine();
  }

  private delay(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }

  private setupTtsListeners() {
    Tts.addEventListener('tts-start', () => {
      this.status = 'playing';
    });

    Tts.addEventListener('tts-finish', () => {
      this.options.onSectionComplete?.();
      this.status = 'idle';
    });

    Tts.addEventListener('tts-error', async (event) => {
      console.error('[TTS-Engine] tts-error event fired:', event);
      this.status = 'idle';

      // 지연 + 보이스 폴백 후 재시도
      if (this.retryCount < this.maxRetry) {
        this.retryCount++;
        await this.ensureVoiceFallback();
        await this.delay(400 + 200 * this.retryCount);
        try {
          // 현재 섹션을 다시 시도
          await this.stop();
          await this.delay(120);
          await this.play();
          return;
        } catch (e) {
          console.warn('[TTS] Retry failed:', e);
        }
      }

      this.options.onError?.(new Error((event as any)?.message || 'TTS Engine Error'));
    });
  }

  private async initializeTtsEngine() {
    try {
      if (Platform.OS === 'android') {
        // Android: Audio ducking 비활성화 - TTS와 TalkBack 볼륨 균형 개선
        // @ts-ignore
        Tts.setDucking?.(false);
      }

      await Tts.getInitStatus();
      this.isTtsInitialized = true;
      console.log('[TTS] Tts Engine Initialized.');

      const initialOptions = this.getOptions();
      await Tts.setDefaultLanguage(initialOptions.language || 'ko-KR');
      await Tts.setDefaultRate((initialOptions.rate || 1.0) / 2);
      await Tts.setDefaultPitch(initialOptions.pitch || 1.0);
    } catch (error) {
      console.error('[TTS] Failed to initialize Tts Engine:', error);
      this.isTtsInitialized = false;
    }
  }

  async initialize(sections: Section[], startIndex: number = 0, options: TTSOptions = {}): Promise<void> {
    this.sections = sections;
    this.currentSectionIndex = startIndex;
    this.playMode = options.playMode || 'single';
    this.targetRepeatCount = options.repeatCount ?? 2;
    this.currentRepeatCount = 0;

    this.options = {
      language: 'ko-KR',
      pitch: options.pitch || 1.0,
      rate: options.rate || 1.0, // 기본 배속 1.0x
      volume: 1.0,
      pauseSettings: { ...this.defaultPauseSettings },
      ...options,
    };
    this.status = 'idle';

    this.clearPauseAfterTimer();
    this.bumpSpeakToken();

    if (this.isTtsInitialized) {
      await this.applyTtsOptions(this.options);
    }

    // 재시도 카운터 초기화
    this.retryCount = 0;

    console.log('[TTS] Initialized with options:', this.options);
  }

  /** TalkBack 안내 대기 시간(ms) 조정 - 현재는 사용하지 않음 */
  public setScreenReaderLeadDelay(ms: number) {
    this.srDelayMs = Math.max(0, ms | 0);
  }

  async syncWithSettings(settings: SyncOptions): Promise<void> {
    console.log('[TTS] Syncing with app settings:', settings);
    this.options.rate = settings.rate;
    this.options.pitch = settings.pitch;
    this.options.volume = settings.volume;
    if (settings.voiceId) {
      this.options.voice = settings.voiceId;
    }

    if (this.isTtsInitialized) {
      await this.applyTtsOptions(this.options);
    } else {
      console.warn('[TTS] Tts Engine not initialized, skipping sync apply.');
    }
  }

  private async applyTtsOptions(options: TTSOptions) {
    if (options.language) await Tts.setDefaultLanguage(options.language);
    if (options.rate !== undefined) await Tts.setDefaultRate(options.rate / 2);
    if (options.pitch !== undefined) await Tts.setDefaultPitch(options.pitch);
    if (options.voice) await this.validateAndSetVoice(options.voice);
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
      case 'formula':
        basePause = settings.formula ?? this.defaultPauseSettings.formula;
        break;
      case 'image_description':
        basePause = settings.imageDescription ?? this.defaultPauseSettings.imageDescription;
        break;
      default:
        basePause = settings.default ?? this.defaultPauseSettings.default;
    }

    return Math.round(basePause / rate);
  }

  async play(): Promise<void> {
    if (this.sections.length === 0) {
      console.warn('[TTS] No sections to play');
      return;
    }
    if (!this.isTtsInitialized) {
      console.warn('[TTS] Tts Engine not initialized yet.');
      return;
    }
    if (this.currentSectionIndex >= this.sections.length) {
      this.status = 'stopped';
      return;
    }

    const currentSection = this.sections[this.currentSectionIndex];
    this.status = 'playing';

    console.log('=== TTS Play Debug ===');
    console.log('Section index:', this.currentSectionIndex);
    console.log('Rate:', this.options.rate);
    console.log('Volume:', this.options.volume);
    console.log('Pitch:', this.options.pitch);
    console.log('Voice:', this.options.voice);

    const pauseAfter = this.getPauseTime(currentSection.type);
    const myToken = ++this.speakToken;

    try {
      await this.speakCurrent(currentSection.text);

      this.status = 'playing';
      this.options.onStart?.();

      await this.waitForTtsFinish(myToken, pauseAfter);
    } catch (error) {
      console.error('[TTS] ✗ speakCurrent error:', error);
      this.status = 'idle';
      this.options.onError?.(error as Error);
    }
  }

  // stop → 짧은 지연 → 옵션 재적용 → speak (레이스/보이스 문제 완화)
  private async speakCurrent(text: string): Promise<void> {
    // 강제 정지 후 짧은 지연으로 엔진 상태 안정화
    await Tts.stop().catch(() => {});
    await this.delay(80);

    await this.applyTtsOptions(this.options);

    // iOS: iosVoiceId, Android: stream/volume
    await Tts.speak(text, {
      iosVoiceId: this.options.voice || '',
      rate: (this.options.rate || 1.0) / 2,
      androidParams: {
        KEY_PARAM_STREAM: 'STREAM_MUSIC',
        KEY_PARAM_VOLUME: this.options.volume || 1.0,
        KEY_PARAM_PAN: 0,
      },
    });

    console.log('[TTS] Tts.speak() call initiated successfully');
  }

  private async waitForTtsFinish(token: number, pauseAfter: number): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        const finishListener = (event: any) => {
          Tts.removeAllListeners('tts-finish');
          Tts.removeAllListeners('tts-error');
          resolve();
        };
        const errorListener = (event: any) => {
          Tts.removeAllListeners('tts-finish');
          Tts.removeAllListeners('tts-error');
          reject(new Error(event?.message || 'TTS Error'));
        };
        Tts.addEventListener('tts-finish', finishListener);
        Tts.addEventListener('tts-error', errorListener);
      });

      if (this.speakToken !== token) return;
      console.log('[TTS] ✓ Tts playback finished');

      this.clearPauseAfterTimer();
      if (pauseAfter > 0) {
        this.pauseAfterTimer = setTimeout(() => {
          if (this.speakToken !== token) return;
          this.handleDone();
        }, pauseAfter);
      } else {
        this.handleDone();
      }
    } catch (error) {
      if (this.speakToken !== token) return;
      console.error('[TTS] ✗ Tts playback error:', error);
      this.status = 'idle';
      this.options.onError?.(error as Error);
    }
  }

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

  async pause(): Promise<void> {
    if (this.status === 'playing') {
      this.clearPauseAfterTimer();
      try {
        await Tts.stop();
        this.status = 'paused';
        console.log('[TTS] Paused (stopped)');
      } catch (error) {
        console.warn('[TTS] Pause failed:', error);
        this.status = 'paused';
      }
    }
  }

  async resume(): Promise<void> {
    if (this.status === 'paused') {
      try {
        console.log('[TTS] Resuming (replaying)');
        await this.play();
      } catch (error) {
        console.warn('[TTS] Resume failed:', error);
      }
    }
  }

  async stop(): Promise<void> {
    this.clearPauseAfterTimer();
    this.bumpSpeakToken();
    await Tts.stop();
    this.status = 'stopped';
    this.currentRepeatCount = 0;
    console.log('[TTS] Stopped');
  }

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

  private async updateAndReplay(callback: () => void): Promise<void> {
    if (!this.isTtsInitialized) {
      console.warn('[TTS] Tts Engine not initialized, skipping updateAndReplay.');
      callback();
      return;
    }

    const wasPlaying = this.status === 'playing';
    const currentIndex = this.currentSectionIndex;

    this.clearPauseAfterTimer();
    this.bumpSpeakToken();

    await Tts.stop();
    this.status = 'idle';

    callback();
    await this.applyTtsOptions(this.options);

    this.currentSectionIndex = currentIndex;
    if (wasPlaying) {
      await this.play();
    } else {
      this.status = 'idle';
    }
  }

  async setRate(rate: number): Promise<void> {
    console.log('[TTS] Rate changed to:', rate);
    await this.updateAndReplay(() => {
      this.options.rate = rate;
    });
  }

  async setPitch(pitch: number): Promise<void> {
    console.log('[TTS] Pitch changed to:', pitch);
    await this.updateAndReplay(() => {
      this.options.pitch = pitch;
    });
  }

  async setVolume(volume: number): Promise<void> {
    console.log('[TTS] Volume changed to:', volume);
    await this.updateAndReplay(() => {
      this.options.volume = volume;
    });
  }

  setLanguage(language: string): void {
    this.options.language = language;
    console.log('[TTS] Language changed to:', language);
  }

  async setVoice(voice: string): Promise<void> {
    console.log('[TTS] Voice changed to:', voice);
    await this.updateAndReplay(() => {
      this.options.voice = voice;
    });
  }

    /**
   * 현재 TTS 설정으로 샘플 텍스트를 재생합니다.
   * 설정 화면 등에서 테스트용으로 사용됩니다.
   * @param text 재생할 텍스트
   */
  async speakSample(text: string): Promise<void> {
    if (!this.isTtsInitialized) {
      console.warn('[TTS] Tts Engine not initialized, skipping sample speak.');
      return;
    }

    return new Promise(async (resolve, reject) => {
      try {
        await this.stop();
        await this.applyTtsOptions(this.options);

        const finishListener = () => {
          Tts.removeAllListeners('tts-finish');
          Tts.removeAllListeners('tts-error');
          resolve();
        };

        const errorListener = (error: any) => {
          Tts.removeAllListeners('tts-finish');
          Tts.removeAllListeners('tts-error');
          console.error('[TTS] Failed to speak sample:', error);
          this.options.onError?.(error as Error);
          reject(error);
        };

        Tts.addEventListener('tts-finish', finishListener);
        Tts.addEventListener('tts-error', errorListener);

        console.log('[TTS] Speaking sample with options:', this.options);
        await Tts.speak(text, {
          iosVoiceId: this.options.voice || '',
          rate: (this.options.rate || 1.0) / 2,
          androidParams: {
            KEY_PARAM_STREAM: 'STREAM_MUSIC',
            KEY_PARAM_VOLUME: this.options.volume || 1.0,
            KEY_PARAM_PAN: 0,
          },
        });
      } catch (error) {
        console.error('[TTS] Failed to initiate sample speak:', error);
        this.options.onError?.(error as Error);
        reject(error);
      }
    });
  }

  setPauseSettings(settings: Partial<PauseSettings>): void {
    this.options.pauseSettings = {
      ...this.defaultPauseSettings,
      ...this.options.pauseSettings,
      ...settings,
    };
  }

  setPlayMode(mode: PlayMode, repeatCount?: number): void {
    this.playMode = mode;
    if (repeatCount !== undefined) {
      this.targetRepeatCount = repeatCount;
    }
    this.currentRepeatCount = 0;
    console.log('[TTS] Play mode changed to:', mode);
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

  private getVoiceDisplayName(voiceId: string, voiceName: string, index: number): string {
    console.log(`[TTS] Processing voice: id=${voiceId}, name=${voiceName}`);

    if (voiceId.includes('SMT')) {
      const match = voiceId.match(/SMT([lmh])(\d+)/);
      if (match) {
        const [, gender, num] = match;
        const genderName =
          gender === 'l' ? '여성' :
          gender === 'm' ? '남성' :
          gender === 'h' ? '고음' : '목소리';
        const paddedNum = num.padStart(2, '0');
        return `${genderName} ${paddedNum}`;
      }
    }

    if (voiceId.includes('Google') || voiceName.includes('Google')) {
      const match = voiceId.match(/(female|male|woman|man)[\s-]?(\d*)/i);
      if (match) {
        const [, gender, num] = match;
        const genderName = gender.toLowerCase().includes('f') ||
          gender.toLowerCase().includes('w') ? '여성' : '남성';
        if (num) {
          const paddedNum = num.padStart(2, '0');
          return `${genderName} ${paddedNum}`;
        }
        return `${genderName} ${String(index + 1).padStart(2, '0')}`;
      }
      return `구글 ${String(index + 1).padStart(2, '0')}`;
    }

    const paddedIndex = String(index + 1).padStart(2, '0');
    return `목소리 ${paddedIndex}`;
  }

  async getAvailableVoices(): Promise<{ id: string; name: string; language: string; quality: number; default?: boolean }[]> {
    try {
      if (!this.isTtsInitialized) {
        await this.initializeTtsEngine();
      }
      const voices = await Tts.voices();
      const koVoices = voices.filter((voice) => voice.language?.startsWith('ko'));

      console.log('[TTS] Available Korean voices:', koVoices.length);
      console.log('[TTS] Raw voice data:', koVoices.map((v) => ({ id: v.id, name: v.name })));

      const processedVoices = koVoices.map((v, index) => ({
        id: v.id,
        name: this.getVoiceDisplayName(v.id, v.name, index),
        language: v.language,
        quality: v.quality,
        default: index === 0,
      }));

      console.log('[TTS] Processed voice names:', processedVoices.map((v) => v.name));

      return processedVoices;
    } catch (error) {
      console.error('[TTS] Failed to get voices:', error);
      return [];
    }
  }

  // voice 검증/설정 (요청한 voice가 없으면 한국어 보이스로 폴백)
  private async validateAndSetVoice(voiceId?: string) {
    if (!voiceId) return;
    try {
      const voices = await Tts.voices();
      const hit = voices.find((v: any) => v?.id === voiceId || v?.name === voiceId);
      if (hit) {
        await Tts.setDefaultVoice(hit.id || voiceId);
        return;
      }
      const ko = voices.find((v: any) => (v?.language || '').startsWith('ko'));
      if (ko?.id) {
        await Tts.setDefaultVoice(ko.id);
        this.options.voice = ko.id;
      }
    } catch {
      // ignore
    }
  }

  private async ensureVoiceFallback() {
    try {
      const voices = await Tts.voices();
      const ko = voices.find((v: any) => (v?.language || '').startsWith('ko'));
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

  async isSpeaking(): Promise<boolean> {
    return this.status === 'playing';
  }

  async cleanup(): Promise<void> {
    console.log('[TTS] Cleanup started');

    this.clearPauseAfterTimer();
    this.bumpSpeakToken();

    try {
      await Tts.stop();
    } catch (error) {
      console.warn('[TTS] Stop failed during cleanup:', error);
    }

    Tts.removeAllListeners('tts-start');
    Tts.removeAllListeners('tts-finish');
    Tts.removeAllListeners('tts-error');

    this.sections = [];
    this.currentSectionIndex = 0;
    this.status = 'idle';
    this.options = {};
    this.currentRepeatCount = 0;
    this.playMode = 'single';
    this.retryCount = 0;

    console.log('[TTS] Cleanup completed');
  }
}

const ttsService = new TTSService();
export default ttsService;
