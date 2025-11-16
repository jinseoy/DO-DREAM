import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import CryptoJS from 'crypto-js';

/**
 * 기기 고유 ID 생성
 * - 앱 재설치 시에도 동일한 ID 유지 (getUniqueId 사용)
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    const uniqueId = await DeviceInfo.getUniqueId();
    return uniqueId;
  } catch (error) {
    console.error('[DeviceUtils] Failed to get device ID:', error);
    // Fallback: 랜덤 UUID 생성
    return generateUUID();
  }
};

/**
 * 플랫폼 정보 (ios | android)
 */
export const getPlatform = (): 'ios' | 'android' => {
  return Platform.OS === 'ios' ? 'ios' : 'android';
};

/**
 * 생체인증 시크릿 생성
 * - 기기 ID + 학번 + 타임스탬프를 해시화
 */
export const generateDeviceSecret = async (studentNumber: string): Promise<string> => {
  try {
    const deviceId = await getDeviceId();
    const timestamp = Date.now().toString();
    const rawSecret = `${deviceId}-${studentNumber}-${timestamp}`;
    
    // SHA-256 해시
    const hash = CryptoJS.SHA256(rawSecret).toString();
    return hash;
  } catch (error) {
    console.error('[DeviceUtils] Failed to generate device secret:', error);
    throw error;
  }
};

/**
 * UUID v4 생성 (Fallback)
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 기기 정보 저장/조회용 타입
 */
export interface DeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android';
  deviceSecret: string;
}