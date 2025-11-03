import * as Speech from 'expo-speech';
import { Section } from '../types/chapter';
import { PlayMode } from '../types/playMode';

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
  private playMode: PlayMode = 'continuous';
  private currentRepeatCount: number = 0;
  private targetRepeatCount: number = 2;
  
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
    this.playMode = options.playMode || 'continuous';
    this.targetRepeatCount = options.repeatCount || 2;
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
    
    // TTS 속도에 반비례하여 pause 시간 조정
    // 예: 1.5배속이면 pause도 1.5배 빠르게 (시간은 나누기)
    // 0.8배속이면 pause도 0.8배 느리게 (시간은 곱하기)
    return Math.round(basePause / rate);
  }

  async play(): Promise<void> {
    if (this.sections.length === 0) {
      console.warn('No sections to play');
      return;
    }

    if (this.status === 'paused') {
      await Speech.resume();
      this.status = 'playing';
      return;
    }

    if (this.currentSectionIndex >= this.sections.length) {
      console.log('Reached end of sections');
      this.status = 'stopped';
      return;
    }

    const currentSection = this.sections[this.currentSectionIndex];
    this.status = 'playing';

    const pauseAfter = this.getPauseTime(currentSection.type);

    try {
      await Speech.speak(currentSection.text, {
        language: this.options.language,
        pitch: this.options.pitch,
        rate: this.options.rate,
        volume: this.options.volume,
        voice: this.options.voice,
        onStart: () => {
          this.status = 'playing';
          this.options.onStart?.();
        },
        onDone: () => {
          if (pauseAfter > 0) {
            setTimeout(() => {
              this.handleDone();
            }, pauseAfter);
          } else {
            this.handleDone();
          }
        },
        onError: (error) => {
          this.status = 'idle';
          const errorMessage = typeof error === 'string' ? error : error.message || 'TTS error occurred';
          this.options.onError?.(new Error(errorMessage));
        },
        onBoundary: this.options.onBoundary,
      });
    } catch (error) {
      console.error('TTS play error:', error);
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
      await Speech.pause();
      this.status = 'paused';
    }
  }

  async resume(): Promise<void> {
    if (this.status === 'paused') {
      await Speech.resume();
      this.status = 'playing';
    }
  }

  async stop(): Promise<void> {
    await Speech.stop();
    this.status = 'stopped';
    this.currentRepeatCount = 0;
  }

  async goToSection(index: number, autoPlay: boolean = false): Promise<void> {
    if (index < 0 || index >= this.sections.length) {
      console.warn('Invalid section index');
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

  setRate(rate: number): void {
    this.options.rate = rate;
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
      return voices.filter((voice) => voice.language.startsWith('ko'));
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }

  async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  }

  cleanup(): void {
    Speech.stop();
    this.sections = [];
    this.currentSectionIndex = 0;
    this.status = 'idle';
    this.options = {};
    this.currentRepeatCount = 0;
  }
}

const ttsService = new TTSService();

export default ttsService;