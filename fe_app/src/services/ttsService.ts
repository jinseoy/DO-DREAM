import * as Speech from 'expo-speech';
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

  // 안정성 향상: 콜백 레이스 방지용 토큰 & 지연 타이머
  private speakToken: number = 0;
  private pauseAfterTimer: ReturnType<typeof setTimeout> | null = null;

  private defaultPauseSettings: PauseSettings = {
    heading: 1500,
    paragraph: 800,
    formula: 1200,
    imageDescription: 1000,
    default: 500,
  };

  initialize(sections: Section[], startIndex: number = 0, options: TTSOptions = {}) {
    this.sections = sections;
    this.currentSectionIndex = startIndex;
    this.playMode = options.playMode || 'single';
    this.targetRepeatCount = options.repeatCount ?? 2;
    this.currentRepeatCount = 0;

    this.options = {
      language: 'ko-KR',
      pitch: 1.0,
      rate: 1.0,
      volume: 1.0,
      pauseSettings: { ...this.defaultPauseSettings },
      ...options,
    };
    this.status = 'idle';

    // 초기화 시 기존 예약 타이머/토큰 정리
    this.clearPauseAfterTimer();
    this.bumpSpeakToken();
    
    console.log('[TTS] Initialized with options:', this.options);
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

    // 재생 속도에 반비례
    return Math.round(basePause / rate);
  }

  async play(): Promise<void> {
    if (this.sections.length === 0) {
      console.warn('[TTS] No sections to play');
      return;
    }

    // 이미 실제로 말하는 중이면 중복 재생 방지
    if (this.status === 'playing') {
      try {
        if (await Speech.isSpeakingAsync()) {
          console.log('[TTS] Already playing, skipping duplicate play call');
          return;
        }
      } catch {}
    }

    if (this.currentSectionIndex >= this.sections.length) {
      this.status = 'stopped';
      return;
    }

    const currentSection = this.sections[this.currentSectionIndex];
    this.status = 'playing';

    console.log('=== TTS Play Debug ===');
    console.log('Platform:', Platform.OS);
    console.log('Section index:', this.currentSectionIndex);
    console.log('Section type:', currentSection.type);
    console.log('Text length:', currentSection.text.length);
    console.log('Text preview:', currentSection.text.substring(0, 100));
    console.log('Language:', this.options.language);
    console.log('Rate:', this.options.rate);
    console.log('Volume:', this.options.volume);
    console.log('Pitch:', this.options.pitch);

    // Android TTS 엔진 사용 가능 여부 확인
    if (Platform.OS === 'android') {
      try {
        const available = await Speech.isSpeakingAsync();
        console.log('[TTS] Speech available check:', available);
      } catch (error) {
        console.error('[TTS] Speech availability check failed:', error);
      }
    }

    const pauseAfter = this.getPauseTime(currentSection.type);
    const myToken = ++this.speakToken;

    try {
      console.log('[TTS] Calling Speech.speak()...');
      
      await Speech.speak(currentSection.text, {
        language: this.options.language,
        pitch: this.options.pitch,
        rate: this.options.rate,
        volume: 1.0,
        voice: this.options.voice,
        onStart: () => {
          if (this.speakToken !== myToken) return;
          console.log('[TTS] ✓ onStart callback fired');
          this.status = 'playing';
          this.options.onStart?.();
        },
        onDone: () => {
          if (this.speakToken !== myToken) return;
          console.log('[TTS] ✓ onDone callback fired');
          this.clearPauseAfterTimer();
          if (pauseAfter > 0) {
            this.pauseAfterTimer = setTimeout(() => {
              if (this.speakToken !== myToken) return;
              this.handleDone();
            }, pauseAfter);
          } else {
            this.handleDone();
          }
        },
        onError: (error) => {
          if (this.speakToken !== myToken) return;
          console.error('[TTS] ✗ onError callback fired:', error);
          this.status = 'idle';
          const errorMessage =
            typeof error === 'string' ? error : (error as any)?.message || 'TTS error occurred';
          this.options.onError?.(new Error(errorMessage));
        },
      });
      
      console.log('[TTS] Speech.speak() call completed successfully');
    } catch (error) {
      console.error('[TTS] ✗ Speech.speak() threw error:', error);
      this.status = 'idle';
      this.options.onError?.(error as Error);
    }
  }

  private handleDone(): void {
    switch (this.playMode) {
      case 'single':
        // Single 모드: 섹션 완료 후 idle 상태로 전환
        // 사용자가 재생 버튼을 누르면 현재 섹션을 다시 재생할 수 있음
        this.status = 'idle';
        this.options.onSectionComplete?.();
        break;

      case 'repeat':
        this.currentRepeatCount++;
        if (this.currentRepeatCount < this.targetRepeatCount) {
          // 같은 섹션 반복
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
        // Android에서는 pause()가 지원되지 않으므로 stop() 사용
        await Speech.stop();
        this.status = 'paused';
        console.log('[TTS] Paused (stopped)');
      } catch (error) {
        console.warn('[TTS] Pause failed:', error);
        await Speech.stop();
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
        await this.play();
      }
    }
  }

  async stop(): Promise<void> {
    this.clearPauseAfterTimer();
    this.bumpSpeakToken();
    await Speech.stop();
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

  async setRate(rate: number): Promise<void> {
    this.options.rate = rate;
    console.log('[TTS] Rate changed to:', rate);

    if (this.status === 'playing' || this.status === 'paused') {
      const wasPlaying = this.status === 'playing';
      const currentIndex = this.currentSectionIndex;

      this.clearPauseAfterTimer();
      this.bumpSpeakToken();

      await Speech.stop();
      this.status = 'idle';

      this.currentSectionIndex = currentIndex;
      if (wasPlaying) {
        await this.play();
      } else {
        this.status = 'paused';
      }
    }
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

  async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const koVoices = voices.filter((voice) => voice.language?.startsWith('ko'));
      console.log('[TTS] Available Korean voices:', koVoices.length);
      return koVoices;
    } catch (error) {
      console.error('[TTS] Failed to get voices:', error);
      return [];
    }
  }

  async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch {
      return false;
    }
  }

  cleanup(): void {
    this.clearPauseAfterTimer();
    this.bumpSpeakToken();
    Speech.stop();
    this.sections = [];
    this.currentSectionIndex = 0;
    this.status = 'idle';
    this.options = {};
    this.currentRepeatCount = 0;
    console.log('[TTS] Cleaned up');
  }
}

const ttsService = new TTSService();
export default ttsService;