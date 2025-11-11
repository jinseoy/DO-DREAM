/**
 * 앱 설정 전역 상태 관리 Store (Zustand)
 * - TTS 속도, 높낮이, 볼륨, 목소리
 * - 고대비 모드, 글자 크기
 * - MMKV와 자동 동기화
 */
import { create } from 'zustand';
import {
  getTTSSpeed, saveTTSSpeed,
  getTTSPitch, saveTTSPitch,
  getTTSVolume, saveTTSVolume,
  getTTSVoiceId, saveTTSVoiceId,
  getHighContrastMode, saveHighContrastMode,
  getFontSizeScale, saveFontSizeScale,
} from '../services/appStorage';

export interface AppSettings {
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  ttsVoiceId: string | null;
  highContrastMode: boolean;
  fontSizeScale: number;
}

interface AppSettingsStore {
  // 상태
  settings: AppSettings;
  isInitialized: boolean;

  // 액션
  hydrate: () => void;
  setTTSRate: (rate: number) => void;
  setTTSPitch: (pitch: number) => void;
  setTTSVolume: (volume: number) => void;
  setTTSVoiceId: (voiceId: string) => void;
  setHighContrastMode: (enabled: boolean) => void;
  setFontSizeScale: (scale: number) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  ttsVoiceId: null,
  highContrastMode: false,
  fontSizeScale: 1.2, // 저시력 고려 기본값
};

export const useAppSettingsStore = create<AppSettingsStore>((set, get) => ({
  // 초기 상태
  settings: DEFAULT_SETTINGS,
  isInitialized: false,

  /**
   * MMKV에서 설정 불러오기 (앱 시작 시 호출)
   */
  hydrate: () => {
    try {
      const settings: AppSettings = {
        ttsRate: getTTSSpeed(),
        ttsPitch: getTTSPitch(),
        ttsVolume: getTTSVolume(),
        ttsVoiceId: getTTSVoiceId(),
        highContrastMode: getHighContrastMode(),
        fontSizeScale: getFontSizeScale() || 1.2,
      };

      set({ settings, isInitialized: true });
      console.log('[AppSettingsStore] Hydrated successfully:', settings);
    } catch (error) {
      console.error('[AppSettingsStore] Hydration failed:', error);
      set({ settings: DEFAULT_SETTINGS, isInitialized: true });
    }
  },

  /**
   * TTS 재생 속도 설정
   */
  setTTSRate: (rate: number) => {
    try {
      saveTTSSpeed(rate);
      set((state) => ({
        settings: { ...state.settings, ttsRate: rate },
      }));
      console.log('[AppSettingsStore] TTS Rate updated:', rate);
    } catch (error) {
      console.error('[AppSettingsStore] Failed to set TTS rate:', error);
    }
  },

  /**
   * TTS 높낮이 설정
   */
  setTTSPitch: (pitch: number) => {
    try {
      saveTTSPitch(pitch);
      set((state) => ({
        settings: { ...state.settings, ttsPitch: pitch },
      }));
      console.log('[AppSettingsStore] TTS Pitch updated:', pitch);
    } catch (error) {
      console.error('[AppSettingsStore] Failed to set TTS pitch:', error);
    }
  },

  /**
   * TTS 볼륨 설정
   */
  setTTSVolume: (volume: number) => {
    try {
      saveTTSVolume(volume);
      set((state) => ({
        settings: { ...state.settings, ttsVolume: volume },
      }));
      console.log('[AppSettingsStore] TTS Volume updated:', volume);
    } catch (error) {
      console.error('[AppSettingsStore] Failed to set TTS volume:', error);
    }
  },

  /**
   * TTS 목소리 설정
   */
  setTTSVoiceId: (voiceId: string) => {
    try {
      saveTTSVoiceId(voiceId);
      set((state) => ({
        settings: { ...state.settings, ttsVoiceId: voiceId },
      }));
      console.log('[AppSettingsStore] TTS Voice ID updated:', voiceId);
    } catch (error) {
      console.error('[AppSettingsStore] Failed to set TTS voice ID:', error);
    }
  },

  /**
   * 고대비 모드 설정
   */
  setHighContrastMode: (enabled: boolean) => {
    try {
      saveHighContrastMode(enabled);
      set((state) => ({
        settings: { ...state.settings, highContrastMode: enabled },
      }));
      console.log('[AppSettingsStore] High Contrast Mode updated:', enabled);
    } catch (error) {
      console.error('[AppSettingsStore] Failed to set high contrast mode:', error);
    }
  },

  /**
   * 글자 크기 설정
   */
  setFontSizeScale: (scale: number) => {
    try {
      saveFontSizeScale(scale);
      set((state) => ({
        settings: { ...state.settings, fontSizeScale: scale },
      }));
      console.log('[AppSettingsStore] Font Size Scale updated:', scale);
    } catch (error) {
      console.error('[AppSettingsStore] Failed to set font size scale:', error);
    }
  },

  /**
   * 설정 초기화
   */
  resetSettings: () => {
    try {
      // MMKV에 기본값 저장
      saveTTSSpeed(DEFAULT_SETTINGS.ttsRate);
      saveTTSPitch(DEFAULT_SETTINGS.ttsPitch);
      saveTTSVolume(DEFAULT_SETTINGS.ttsVolume);
      if (DEFAULT_SETTINGS.ttsVoiceId) {
        saveTTSVoiceId(DEFAULT_SETTINGS.ttsVoiceId);
      }
      saveHighContrastMode(DEFAULT_SETTINGS.highContrastMode);
      saveFontSizeScale(DEFAULT_SETTINGS.fontSizeScale);

      set({ settings: DEFAULT_SETTINGS });
      console.log('[AppSettingsStore] Settings reset to default');
    } catch (error) {
      console.error('[AppSettingsStore] Failed to reset settings:', error);
    }
  },
}));