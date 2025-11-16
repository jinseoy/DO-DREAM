import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * 생체인증 유형
 */
export enum BiometricType {
  FINGERPRINT = 'FINGERPRINT',
  FACIAL_RECOGNITION = 'FACIAL_RECOGNITION',
  IRIS = 'IRIS',
  NONE = 'NONE',
}

/**
 * 생체인증 결과
 */
export interface BiometricResult {
  success: boolean;
  error?: string;
  biometricType?: BiometricType;
}

/**
 * 생체인증 유틸리티 클래스
 */
class BiometricUtil {
  /**
   * 하드웨어 지원 여부
   */
  async isSupported(): Promise<boolean> {
    try {
      return await LocalAuthentication.hasHardwareAsync();
    } catch {
      return false;
    }
  }

  /**
   * 생체인증이 등록되어 있는지 확인
   */
  async isEnrolled(): Promise<boolean> {
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch {
      return false;
    }
  }

  /**
   * 지원되는 인증 타입(하드웨어 기준)
   */
  async getSupportedTypes(): Promise<BiometricType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const result: BiometricType[] = [];

      types.forEach((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            result.push(BiometricType.FINGERPRINT);
            break;
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            result.push(BiometricType.FACIAL_RECOGNITION);
            break;
          case LocalAuthentication.AuthenticationType.IRIS:
            result.push(BiometricType.IRIS);
            break;
        }
      });

      return result;
    } catch {
      return [];
    }
  }

  /**
   *  화면 표기용 라벨 (등록 상태 우선, 혼합 시 중립) 
   */
  async getBiometricTypeDescription(): Promise<string> {
    const enrolled = await this.isEnrolled();
    const types = await this.getSupportedTypes();

    // 등록되어 있지 않으면 확정 불가 → 중립 표기
    if (!enrolled) return '생체인증';

    const hasFingerprint = types.includes(BiometricType.FINGERPRINT);
    const hasFace = types.includes(BiometricType.FACIAL_RECOGNITION);
    const hasIris = types.includes(BiometricType.IRIS);

    const onlyFingerprint = hasFingerprint && !hasFace && !hasIris;
    const onlyFace = hasFace && !hasFingerprint && !hasIris;

    if (onlyFingerprint) return '지문인증';
    if (onlyFace) return Platform.OS === 'ios' ? 'Face ID' : '얼굴인증';
    return '생체인증';
  }

  /**
   * 생체인증 실행
   */
  async authenticate(options?: {
    promptMessage?: string;
    cancelLabel?: string;
    disableDeviceFallback?: boolean;
  }): Promise<BiometricResult> {
    try {
      const supported = await this.isSupported();
      const enrolled = await this.isEnrolled();

      if (!supported || !enrolled) {
        return { success: false, error: '생체인증을 사용할 수 없습니다.' };
      }

      const typeDesc = await this.getBiometricTypeDescription();
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options?.promptMessage || `${typeDesc}으로 인증하세요`,
        cancelLabel: options?.cancelLabel || '취소',
        disableDeviceFallback: options?.disableDeviceFallback ?? true,
        // 안드로이드에서 확인 단계 요구(오탭/중복 입력 방지)
        requireConfirmation: Platform.OS === 'android',
      });

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: '인증에 실패했습니다.' };
      }
    } catch (e: any) {
      return { success: false, error: e?.message ?? '인증 오류' };
    }
  }
}

export const biometricUtil = new BiometricUtil();