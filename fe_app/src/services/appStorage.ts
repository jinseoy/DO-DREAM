/**
 * 앱 전반의 범용 저장소
 * - Progress (학습 진도)
 * - StudentNumber (학번)
 * - TTS Speed (음성 속도)
 * - Device Info (기기 정보)
 * - App Settings (TTS Pitch, Volume, Voice ID, High Contrast, Font Size)
 * 
 * * 참고: 인증 관련은 authStorage.ts 사용
 */
import { MMKV } from 'react-native-mmkv';
import { LocalProgress } from '../types/progress';

// MMKV 인스턴스 생성
export const storage = new MMKV();

// Storage Keys
const KEYS = {
  PROGRESS: (materialId: string, chapterId: number) => 
    `progress_${materialId}_${chapterId}`,
  STUDENT_NUMBER: 'student_number',
  TTS_SPEED: 'tts_speed',
  TTS_PITCH: 'tts_pitch',
  TTS_VOLUME: 'tts_volume',
  TTS_VOICE_ID: 'tts_voice_id',
  HIGH_CONTRAST_MODE: 'high_contrast_mode',
  FONT_SIZE_SCALE: 'font_size_scale',
  DEVICE_ID: 'device_id',
  DEVICE_SECRET: 'device_secret',
  PLATFORM: 'platform',
};

// Progress 관련
export const saveProgress = (progress: LocalProgress): void => {
  try {
    const key = KEYS.PROGRESS(progress.materialId, progress.chapterId);
    storage.set(key, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};

export const getProgress = (
  materialId: string,
  chapterId: number
): LocalProgress | null => {
  try {
    const key = KEYS.PROGRESS(materialId, chapterId);
    const data = storage.getString(key);
    if (!data) return null;
    
    return JSON.parse(data) as LocalProgress;
  } catch (error) {
    console.error('Failed to parse progress:', error);
    return null;
  }
};

export const deleteProgress = (materialId: string, chapterId: number): void => {
  try {
    const key = KEYS.PROGRESS(materialId, chapterId);
    storage.delete(key);
  } catch (error) {
    console.error('Failed to delete progress:', error);
  }
};

export const clearAllProgress = (): void => {
  try {
    const allKeys = storage.getAllKeys();
    allKeys.forEach((key: string) => {
      if (key.startsWith('progress_')) {
        storage.delete(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear progress:', error);
  }
};

// Student Number 관련
export const saveStudentNumber = (studentNumber: string): void => {
  try {
    storage.set(KEYS.STUDENT_NUMBER, studentNumber);
  } catch (error) {
    console.error('Failed to save student number:', error);
  }
};

export const getStudentNumber = (): string | null => {
  try {
    return storage.getString(KEYS.STUDENT_NUMBER) ?? null;
  } catch (error) {
    console.error('Failed to get student number:', error);
    return null;
  }
};

// 앱 설정 관련 함수 (추가/수정)

// 1. TTS 속도 설정 관련
export const saveTTSSpeed = (speed: number): void => {
  try {
    storage.set(KEYS.TTS_SPEED, speed);
  } catch (error) {
    console.error('Failed to save TTS speed:', error);
  }
};

export const getTTSSpeed = (): number => {
  try {
    return storage.getNumber(KEYS.TTS_SPEED) ?? 1.0;
  } catch (error) {
    console.error('Failed to get TTS speed:', error);
    return 1.0;
  }
};

// 2. TTS Pitch 설정 관련
export const saveTTSPitch = (pitch: number): void => {
  try {
    storage.set(KEYS.TTS_PITCH, pitch);
  } catch (error) {
    console.error('Failed to save TTS pitch:', error);
  }
};

export const getTTSPitch = (): number => {
  try {
    return storage.getNumber(KEYS.TTS_PITCH) ?? 1.0;
  } catch (error) {
    console.error('Failed to get TTS pitch:', error);
    return 1.0;
  }
};

// 3. TTS Volume 설정 관련
export const saveTTSVolume = (volume: number): void => {
  try {
    storage.set(KEYS.TTS_VOLUME, volume);
  } catch (error) {
    console.error('Failed to save TTS volume:', error);
  }
};

export const getTTSVolume = (): number => {
  try {
    return storage.getNumber(KEYS.TTS_VOLUME) ?? 1.0;
  } catch (error) {
    console.error('Failed to get TTS volume:', error);
    return 1.0;
  }
};

// 4. TTS Voice ID 설정 관련
export const saveTTSVoiceId = (voiceId: string): void => {
  try {
    storage.set(KEYS.TTS_VOICE_ID, voiceId);
  } catch (error) {
    console.error('Failed to save TTS voice ID:', error);
  }
};

export const getTTSVoiceId = (): string | null => {
  try {
    return storage.getString(KEYS.TTS_VOICE_ID) ?? null;
  } catch (error) {
    console.error('Failed to get TTS voice ID:', error);
    return null;
  }
};

// 5. 고대비 모드 설정 관련
export const saveHighContrastMode = (enabled: boolean): void => {
  try {
    storage.set(KEYS.HIGH_CONTRAST_MODE, enabled);
  } catch (error) {
    console.error('Failed to save high contrast mode:', error);
  }
};

export const getHighContrastMode = (): boolean => {
  try {
    return storage.getBoolean(KEYS.HIGH_CONTRAST_MODE) ?? false;
  } catch (error) {
    console.error('Failed to get high contrast mode:', error);
    return false;
  }
};

// 6. 글자 크기 스케일 설정 관련
export const saveFontSizeScale = (scale: number): void => {
  try {
    storage.set(KEYS.FONT_SIZE_SCALE, scale);
  } catch (error) {
    console.error('Failed to save font size scale:', error);
  }
};

export const getFontSizeScale = (): number => {
  try {
    return storage.getNumber(KEYS.FONT_SIZE_SCALE) ?? 1.0;
  } catch (error) {
    console.error('Failed to get font size scale:', error);
    return 1.0;
  }
};

// Device 정보 관련
/**
 * 기기 ID 저장
 */
export const saveDeviceId = (deviceId: string): void => {
  try {
    storage.set(KEYS.DEVICE_ID, deviceId);
    console.log('[AppStorage] Device ID saved');
  } catch (error) {
    console.error('[AppStorage] Failed to save device ID:', error);
  }
};

/**
 * 기기 ID 조회
 */
export const getDeviceId = (): string | null => {
  try {
    return storage.getString(KEYS.DEVICE_ID) ?? null;
  } catch (error) {
    console.error('[AppStorage] Failed to get device ID:', error);
    return null;
  }
};

/**
 * 기기 시크릿 저장 (생체인증 해시)
 */
export const saveDeviceSecret = (secret: string): void => {
  try {
    storage.set(KEYS.DEVICE_SECRET, secret);
    console.log('[AppStorage] Device secret saved');
  } catch (error) {
    console.error('[AppStorage] Failed to save device secret:', error);
  }
};

/**
 * 기기 시크릿 조회
 */
export const getDeviceSecret = (): string | null => {
  try {
    return storage.getString(KEYS.DEVICE_SECRET) ?? null;
  } catch (error) {
    console.error('[AppStorage] Failed to get device secret:', error);
    return null;
  }
};

/**
 * 플랫폼 저장 (ios | android)
 */
export const savePlatform = (platform: 'ios' | 'android'): void => {
  try {
    storage.set(KEYS.PLATFORM, platform);
    console.log('[AppStorage] Platform saved:', platform);
  } catch (error) {
    console.error('[AppStorage] Failed to save platform:', error);
  }
};

/**
 * 플랫폼 조회
 */
export const getPlatform = (): string | null => {
  try {
    return storage.getString(KEYS.PLATFORM) ?? null;
  } catch (error) {
    console.error('[AppStorage] Failed to get platform:', error);
    return null;
  }
};

/**
 * 기기 정보 전체 삭제 (로그아웃 시)
 */
export const clearDeviceInfo = (): void => {
  try {
    storage.delete(KEYS.DEVICE_ID);
    storage.delete(KEYS.DEVICE_SECRET);
    storage.delete(KEYS.PLATFORM);
    console.log('[AppStorage] Device info cleared');
  } catch (error) {
    console.error('[AppStorage] Failed to clear device info:', error);
  }
};

export default storage;