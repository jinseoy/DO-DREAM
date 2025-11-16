import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * TTS 옵션
 */
export interface SpeakOptions {
  text: string;
  rate?: number; // 속도 (0.0 ~ 1.0, 기본 1.0)
  pitch?: number; // 음높이 (0.0 ~ 2.0, 기본 1.0)
  language?: string; // 언어 (기본 'ko-KR')
  onDone?: () => void;
}

/**
 * 접근성 유틸리티 클래스
 */
class AccessibilityUtil {
  private isScreenReaderEnabled: boolean = false;

  /**
   * 초기화 - 스크린리더 상태 확인
   */
  async initialize(): Promise<void> {
    this.isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
    
    // 스크린리더 상태 변경 리스너
    AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
      this.isScreenReaderEnabled = enabled;
    });
  }

  /**
   * 스크린리더 활성화 여부 확인
   */
  async isScreenReaderActive(): Promise<boolean> {
    return await AccessibilityInfo.isScreenReaderEnabled();
  }

  /**
   * 현재 스크린리더 상태 반환 (캐시된 값)
   */
  getScreenReaderStatus(): boolean {
    return this.isScreenReaderEnabled;
  }

  /**
   * 텍스트를 음성으로 읽기 (TTS)
   */
  async speak(options: SpeakOptions): Promise<void> {
    const {
      text,
      rate = 1.0,
      pitch = 1.0,
      language = 'ko-KR',
      onDone,
    } = options;

    try {
      // 이미 읽고 있는 경우 중단
      await Speech.stop();

      await Speech.speak(text, {
        language,
        rate,
        pitch,
        onDone,
      });
    } catch (error) {
      console.error('TTS 오류:', error);
    }
  }

  /**
   * TTS 중단
   */
  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('TTS 중단 오류:', error);
    }
  }

  /**
   * 스크린리더에게 공지 (AccessibilityInfo.announceForAccessibility)
   */
  announce(message: string): void {
    AccessibilityInfo.announceForAccessibility(message);
  }

  /**
   * 성공 진동 피드백
   */
  async successVibration(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('진동 피드백 오류:', error);
    }
  }

  /**
   * 에러 진동 피드백
   */
  async errorVibration(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.error('진동 피드백 오류:', error);
    }
  }

  /**
   * 경고 진동 피드백
   */
  async warningVibration(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.error('진동 피드백 오류:', error);
    }
  }

  /**
   * 가벼운 터치 진동
   */
  async lightImpact(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('진동 피드백 오류:', error);
    }
  }

  /**
   * 중간 터치 진동
   */
  async mediumImpact(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('진동 피드백 오류:', error);
    }
  }

  /**
   * 강한 터치 진동
   */
  async heavyImpact(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error('진동 피드백 오류:', error);
    }
  }

  /**
   * 선택 변경 진동 (리스트 스크롤 등)
   */
  async selectionVibration(): Promise<void> {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.error('진동 피드백 오류:', error);
    }
  }

  /**
   * 음성으로 안내하고 진동 제공 (접근성 강화)
   */
  async announceWithVibration(message: string, vibrationType: 'success' | 'error' | 'warning' = 'success'): Promise<void> {
    // 스크린리더가 활성화되어 있으면 announceForAccessibility 사용
    if (this.isScreenReaderEnabled) {
      this.announce(message);
    } else {
      // 스크린리더가 없으면 TTS 직접 실행
      await this.speak({ text: message });
    }

    // 진동 피드백
    switch (vibrationType) {
      case 'success':
        await this.successVibration();
        break;
      case 'error':
        await this.errorVibration();
        break;
      case 'warning':
        await this.warningVibration();
        break;
    }
  }

  /**
   * 플랫폼별 스크린리더 이름 반환
   */
  getScreenReaderName(): string {
    return Platform.OS === 'ios' ? 'VoiceOver' : 'TalkBack';
  }
}

export const accessibilityUtil = new AccessibilityUtil();

// 앱 시작 시 초기화
accessibilityUtil.initialize();