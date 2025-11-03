import * as Speech from 'expo-speech';
import { Section } from '../types/chapter';

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'stopped';

export interface TTSOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  onBoundary?: (event: { charIndex: number; charLength: number }) => void;
}

class TTSService {
  private currentSectionIndex: number = 0;
  private sections: Section[] = [];
  private status: TTSStatus = 'idle';
  private options: TTSOptions = {};
  private autoPlayNext: boolean = true;

  // TTS 초기화
  initialize(sections: Section[], startIndex: number = 0, options: TTSOptions = {}) {
    this.sections = sections;
    this.currentSectionIndex = startIndex;
    this.options = {
      language: 'ko-KR',
      pitch: 1.0,
      rate: 1.0,
      volume: 1.0,
      ...options,
    };
    this.status = 'idle';
  }

  // 현재 섹션 재생
  async play(): Promise<void> {
    if (this.sections.length === 0) {
      console.warn('No sections to play');
      return;
    }

    if (this.status === 'paused') {
      // 일시정지 상태에서는 resume
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
          // 자동으로 다음 섹션 재생
          if (this.autoPlayNext && this.currentSectionIndex < this.sections.length - 1) {
            this.currentSectionIndex++;
            this.play();
          } else {
            this.status = 'idle';
            this.options.onDone?.();
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

  // 일시정지
  async pause(): Promise<void> {
    if (this.status === 'playing') {
      await Speech.pause();
      this.status = 'paused';
    }
  }

  // 재개
  async resume(): Promise<void> {
    if (this.status === 'paused') {
      await Speech.resume();
      this.status = 'playing';
    }
  }

  // 정지
  async stop(): Promise<void> {
    await Speech.stop();
    this.status = 'stopped';
  }

  // 특정 섹션으로 이동 후 재생
  async goToSection(index: number, autoPlay: boolean = false): Promise<void> {
    if (index < 0 || index >= this.sections.length) {
      console.warn('Invalid section index');
      return;
    }

    await this.stop();
    this.currentSectionIndex = index;

    if (autoPlay) {
      await this.play();
    }
  }

  // 이전 섹션
  async previous(): Promise<void> {
    if (this.currentSectionIndex > 0) {
      await this.goToSection(this.currentSectionIndex - 1, true);
    }
  }

  // 다음 섹션
  async next(): Promise<void> {
    if (this.currentSectionIndex < this.sections.length - 1) {
      await this.goToSection(this.currentSectionIndex + 1, true);
    }
  }

  // 속도 변경
  setRate(rate: number): void {
    this.options.rate = rate;
  }

  // 자동 재생 설정
  setAutoPlayNext(enabled: boolean): void {
    this.autoPlayNext = enabled;
  }

  // 현재 상태 가져오기
  getStatus(): TTSStatus {
    return this.status;
  }

  getCurrentSectionIndex(): number {
    return this.currentSectionIndex;
  }

  getSections(): Section[] {
    return this.sections;
  }

  // 사용 가능한 음성 목록 가져오기
  async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.filter((voice) => voice.language.startsWith('ko'));
    } catch (error) {
      console.error('Failed to get voices:', error);
      return [];
    }
  }

  // TTS 엔진이 말하는 중인지 확인
  async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  }

  // 리소스 정리
  cleanup(): void {
    Speech.stop();
    this.sections = [];
    this.currentSectionIndex = 0;
    this.status = 'idle';
    this.options = {};
  }
}

// 싱글톤 인스턴스
const ttsService = new TTSService();

export default ttsService;