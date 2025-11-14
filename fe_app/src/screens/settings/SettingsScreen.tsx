import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ttsService from '../../services/ttsService';
import { useAuthStore } from '../../stores/authStore';
import { useAppSettingsStore } from '../../stores/appSettingsStore';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const logout = useAuthStore((state) => state.logout);
  
  const settings = useAppSettingsStore((state) => state.settings);
  const setTTSRate = useAppSettingsStore((state) => state.setTTSRate);
  const setTTSPitch = useAppSettingsStore((state) => state.setTTSPitch);
  const setTTSVolume = useAppSettingsStore((state) => state.setTTSVolume);
  const setTTSVoiceId = useAppSettingsStore((state) => state.setTTSVoiceId);
  const setHighContrastMode = useAppSettingsStore((state) => state.setHighContrastMode);
  const setFontSizeScale = useAppSettingsStore((state) => state.setFontSizeScale);
  const resetSettings = useAppSettingsStore((state) => state.resetSettings);
  
  const [availableVoices, setAvailableVoices] = useState<{ 
    id: string; 
    name: string; 
    language: string; 
    quality: number; 
    default?: boolean 
  }[]>([]);

  const [isTestingTts, setIsTestingTts] = useState(false);

  useEffect(() => {
    const loadVoices = async () => {
      const voices = await ttsService.getAvailableVoices();

      console.log('[Settings] Original voices:', voices.map(v => ({ id: v.id, name: v.name })));

      setAvailableVoices(voices);

      // 저장된 음성이 없다면 첫 번째 음성을 기본값으로
      if (!settings.ttsVoiceId && voices.length > 0) {
        handleVoiceChange(voices[0].id);
      }
    };
    loadVoices();

    // 화면 unmount 시 TTS 샘플 정지
    return () => {
      console.log('[SettingsScreen] Cleanup - TTS 샘플 정지');
      ttsService.stop();
    };
  }, []);

  // 화면 이탈 시 TTS 샘플 완전 정지 (네비게이션 감지)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async () => {
      console.log('[SettingsScreen] 화면 이탈 감지 - TTS 샘플 정지');
      await ttsService.stop();
    });

    return unsubscribe;
  }, [navigation]);

  // 각 설정별 핸들러 (Store 액션 호출 + TTS 서비스 적용)
  const handleRateChange = useCallback(async (rate: number) => {
    setTTSRate(rate);
    await ttsService.setRate(rate);
    AccessibilityInfo.announceForAccessibility(`${rate.toFixed(2)}배`);
    ttsService.speakSample("현재 속도로 재생됩니다.");
  }, [setTTSRate]);

  const handlePitchChange = useCallback(async (pitch: number) => {
    setTTSPitch(pitch);
    await ttsService.setPitch(pitch);
    AccessibilityInfo.announceForAccessibility(`높낮이 ${pitch.toFixed(1)}`);
    ttsService.speakSample("현재 높낮이로 재생됩니다.");
  }, [setTTSPitch]);

  const handleVolumeChange = useCallback((volume: number) => {
    setTTSVolume(volume);
    ttsService.setVolume(volume);
    AccessibilityInfo.announceForAccessibility(`${Math.round(volume * 100)}퍼센트`);
    ttsService.speakSample("현재 볼륨으로 재생됩니다.");
  }, [setTTSVolume]);

  const handleVoiceChange = useCallback(async (voiceId: string) => {
    setTTSVoiceId(voiceId);
    await ttsService.setVoice(voiceId);
    const voiceName = availableVoices.find(v => v.id === voiceId)?.name || '선택됨';
    AccessibilityInfo.announceForAccessibility(`${voiceName}으로 변경되었습니다.`); 
    // 샘플 음성 재생
    ttsService.speakSample("현재 목소리로 재생됩니다.");
  }, [setTTSVoiceId, availableVoices]);

  const handleHighContrastChange = useCallback((enabled: boolean) => {
    setHighContrastMode(enabled);
    AccessibilityInfo.announceForAccessibility(enabled ? '켜짐' : '꺼짐');
  }, [setHighContrastMode]);
  
  const handleFontSizeChange = useCallback((scale: number) => {
    setFontSizeScale(scale);
    AccessibilityInfo.announceForAccessibility(`${Math.round(scale * 100)}퍼센트`);
  }, [setFontSizeScale]);
  
  const handleTestTTS = async () => {
    if (isTestingTts) return;

    AccessibilityInfo.announceForAccessibility("테스트 재생");
    setIsTestingTts(true);
    try {
      await ttsService.speakSample("현재 설정으로 재생됩니다.");
    } finally {
      setIsTestingTts(false);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      "설정 초기화",
      "모든 설정을 기본값으로 되돌리시겠습니까?",
      [
        {
          text: "취소",
          style: "cancel",
          onPress: () => AccessibilityInfo.announceForAccessibility("취소되었습니다."),
        },
        {
          text: "확인",
          style: "destructive",
          onPress: async () => {
            resetSettings();
            const defaultSettings = useAppSettingsStore.getState().settings;
            await ttsService.syncWithSettings({
              rate: defaultSettings.ttsRate,
              pitch: defaultSettings.ttsPitch,
              volume: defaultSettings.ttsVolume,
              voiceId: defaultSettings.ttsVoiceId,
            });
            AccessibilityInfo.announceForAccessibility("모든 설정이 기본값으로 초기화되었습니다.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };
  
  const renderButtonControl = (
    label: string, 
    value: number,
    min: number, 
    max: number, 
    step: number,
    displayFormatter: (v: number) => string,
    unit: string,
    onDecrease: () => void,
    onIncrease: () => void
  ) => {
    const HC = settings.highContrastMode;
    const baseSize = 24;
    const scale = settings.fontSizeScale;

    return (
      <View style={styles.controlGroup}>
        <Text 
          style={[
            styles.controlLabel, 
            { fontSize: baseSize * scale },
            HC && styles.textHC
          ]}
          accessible={true}
          accessibilityRole="header"
        >
          {label}
        </Text>
        
        <View style={styles.btnRow}>
          <View 
            style={[styles.valueBox, HC && styles.valueBoxHC]}
            accessible={true}
            accessibilityLabel={`현재 ${label}`}
            accessibilityValue={{ text: `${displayFormatter(value)} ${unit}` }}
            accessibilityRole="text"
          >
            <Text style={[
              styles.valueNum, 
              { fontSize: (baseSize + 4) * scale },
              HC && styles.valueNumHC
            ]}>
              {displayFormatter(value)}
            </Text>
            <Text style={[
              styles.valueUnit,
              { fontSize: (baseSize - 4) * scale },
              HC && styles.valueNumHC
            ]}>
              {unit}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.ctrlBtn,
              value <= min && styles.ctrlBtnDisabled,
              HC && styles.ctrlBtnHC
            ]}
            onPress={onDecrease}
            disabled={value <= min}
            accessible={true}
            accessibilityLabel="감소"
            accessibilityRole="button"
            accessibilityHint={`${label} 감소`}
            accessibilityState={{ disabled: value <= min }}
          >
            <Text style={[
              styles.ctrlBtnTxt,
              { fontSize: (baseSize + 16) * scale },
              value <= min && styles.ctrlBtnTxtDisabled,
              HC && styles.ctrlBtnTxtHC
            ]}>
              −
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.ctrlBtn,
              value >= max && styles.ctrlBtnDisabled,
              HC && styles.ctrlBtnHC
            ]}
            onPress={onIncrease}
            disabled={value >= max}
            accessible={true}
            accessibilityLabel="증가"
            accessibilityRole="button"
            accessibilityHint={`${label} 증가`}
            accessibilityState={{ disabled: value >= max }}
          >
            <Text style={[
              styles.ctrlBtnTxt,
              { fontSize: (baseSize + 16) * scale },
              value >= max && styles.ctrlBtnTxtDisabled,
              HC && styles.ctrlBtnTxtHC
            ]}>
              +
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSwitch = (label: string, value: boolean, onChange: (v: boolean) => void) => {
    const HC = settings.highContrastMode;
    const baseSize = 24;
    const scale = settings.fontSizeScale;

    return (
      <View style={styles.switchRow}>
        <Text 
          style={[
            styles.controlLabel,
            { fontSize: baseSize * scale },
            HC && styles.textHC
          ]}
        >
          {label}
        </Text>
        <Switch
          onValueChange={onChange}
          value={value}
          trackColor={{ false: '#9E9E9E', true: '#4CAF50' }}
          thumbColor={value ? '#FFFFFF' : '#F5F5F5'}
          style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
          accessible={true}
          accessibilityLabel={label}
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          accessibilityValue={{ text: value ? '켜짐' : '꺼짐' }}
        />
      </View>
    );
  };

  const renderAction = (label: string, onPress: () => void, bg: string, border: string) => {
    const HC = settings.highContrastMode;
    const baseSize = 24;
    const scale = settings.fontSizeScale;

    return (
      <TouchableOpacity
        style={[
          styles.actionBtn,
          { backgroundColor: bg, borderColor: border },
          HC && styles.actionBtnHC
        ]}
        onPress={onPress}
        accessible={true}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Text style={[
          styles.actionTxt,
          { fontSize: baseSize * scale },
          HC && styles.actionTxtHC
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleGoBack = () => {
    AccessibilityInfo.announceForAccessibility("뒤로");
    navigation.goBack();
  };

  const HC = settings.highContrastMode;
  const baseSize = 24;
  const scale = settings.fontSizeScale;

  return (
    <SafeAreaView 
      style={[styles.container, HC && styles.containerHC]} 
      edges={['top']}
    >
      <View style={[styles.header, HC && styles.headerHC]}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backBtn}
          accessible={true}
          accessibilityLabel="뒤로"
          accessibilityRole="button"
          accessibilityHint="설정 종료"
        >
          <Text style={[
            styles.backTxt,
            { fontSize: (baseSize + 4) * scale },
            HC && styles.textHC
          ]}>
            ← 뒤로
          </Text>
        </TouchableOpacity>
        <Text 
          style={[
            styles.headerTitle,
            { fontSize: (baseSize + 8) * scale },
            HC && styles.textHC
          ]}
          accessible={true}
          accessibilityRole="header"
        >
          설정
        </Text>
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.section, HC && styles.sectionHC]}>
          <Text 
            style={[
              styles.sectionTitle,
              { fontSize: (baseSize + 4) * scale },
              HC && styles.textHC
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            음성 설정
          </Text>

          {/* 재생 속도 */}
          {renderButtonControl(
            '재생 속도',
            settings.ttsRate,
            0.5,
            2.0,
            0.1,
            (v) => v.toFixed(1),
            '배',
            () => handleRateChange(Math.max(0.5, Number((settings.ttsRate - 0.1).toFixed(2)))),
            () => handleRateChange(Math.min(2.0, Number((settings.ttsRate + 0.1).toFixed(2))))
          )}

          {/* 높낮이 */}
          {renderButtonControl(
            '높낮이',
            settings.ttsPitch,
            0.5,
            2.0,
            0.1,
            (v) => v.toFixed(1),
            '',
            () => handlePitchChange(Math.max(0.5, Number((settings.ttsPitch - 0.1).toFixed(2)))),
            () => handlePitchChange(Math.min(2.0, Number((settings.ttsPitch + 0.1).toFixed(2))))
          )}

          {/* 볼륨 */}
          {renderButtonControl(
            '볼륨',
            settings.ttsVolume,
            0.0,
            1.0,
            0.1,
            (v) => Math.round(v * 100).toString(),
            '%',
            () => handleVolumeChange(Math.max(0.0, Number((settings.ttsVolume - 0.1).toFixed(2)))),
            () => handleVolumeChange(Math.min(1.0, Number((settings.ttsVolume + 0.1).toFixed(2))))
          )}

          {/* 음성 선택 */}
          <View style={styles.voiceSection}>
            <Text 
              style={[
                styles.controlLabel,
                { fontSize: baseSize * scale },
                HC && styles.textHC
              ]}
              accessible={true}
              accessibilityRole="header"
            >
              목소리
            </Text>
            
            <View style={styles.voiceList}>
              {availableVoices.map((voice) => {
                const isSelected = settings.ttsVoiceId === voice.id;
                const accessibilityLabel = `목소리, ${voice.name}, ${isSelected ? '선택됨' : '선택 안됨'}`;
                return (
                  <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceBtn,
                    isSelected && styles.voiceBtnSel,
                    HC && isSelected && styles.voiceBtnSelHC,
                  ]}
                  onPress={() => handleVoiceChange(voice.id)}
                  accessible={true}
                  accessibilityLabel={voice.name}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: settings.ttsVoiceId === voice.id }}
                >
                  <Text style={[
                    styles.voiceTxt,
                    { fontSize: (baseSize - 2) * scale },
                    isSelected && styles.voiceTxtSel,
                    HC && isSelected && styles.voiceTxtSelHC,
                  ]}>
                    {voice.name}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {renderAction(
            isTestingTts ? '재생 중...' : '테스트', 
            handleTestTTS, 
            isTestingTts ? '#4CAF50' : '#FFC107', // 재생 중일 때 녹색, 평상시 노란색
            isTestingTts ? '#388E3C' : '#FFA000'
          )}
        </View>

        <View style={[styles.section, HC && styles.sectionHC]}>
          <Text 
            style={[
              styles.sectionTitle,
              { fontSize: (baseSize + 4) * scale },
              HC && styles.textHC
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            화면 설정
          </Text>

          {renderSwitch('고대비 모드', settings.highContrastMode, handleHighContrastChange)}
          
          {/* 글자 크기 */}
          {renderButtonControl(
            '글자 크기',
            settings.fontSizeScale,
            0.8,
            2.0,
            0.1,
            (v) => Math.round(v * 100).toString(),
            '%',
            () => handleFontSizeChange(Math.max(0.8, Number((settings.fontSizeScale - 0.1).toFixed(2)))),
            () => handleFontSizeChange(Math.min(2.0, Number((settings.fontSizeScale + 0.1).toFixed(2))))
          )}
        </View>

        <View style={[styles.section, HC && styles.sectionHC]}>
          <Text 
            style={[
              styles.sectionTitle,
              { fontSize: (baseSize + 4) * scale },
              HC && styles.textHC
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            앱 정보
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={[
              styles.infoLabel,
              { fontSize: (baseSize - 2) * scale },
              HC && styles.textHC
            ]}>
              버전
            </Text>
            <Text style={[
              styles.infoValue,
              { fontSize: (baseSize - 2) * scale },
              HC && styles.textHC
            ]}>
              1.0.0
            </Text>
          </View>

          {renderAction('기본값으로 되돌리기', handleResetSettings, '#F44336', '#D32F2F')}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  containerHC: { backgroundColor: '#000000' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#E0E0E0',
  },
  headerHC: { borderBottomColor: '#FFFFFF' },
  backBtn: { padding: 12, minWidth: 80, minHeight: 60, justifyContent: 'center' },
  backTxt: { fontSize: 28, color: '#2196F3', fontWeight: '700' },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
    marginRight: 80,
  },
  
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60, flexGrow: 1 },
  
  section: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  sectionHC: { backgroundColor: '#1A1A1A', borderColor: '#FFFFFF' },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#BDBDBD',
  },
  
  controlGroup: { marginBottom: 28 },
  controlLabel: { fontSize: 24, fontWeight: '700', color: '#000000', marginBottom: 16 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  valueBox: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 3,
    borderColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minHeight: 80,
    gap: 6,
  },
  valueBoxHC: { backgroundColor: '#000000', borderColor: '#FFEB3B' },
  valueNum: { fontSize: 28, fontWeight: 'bold', color: '#1565C0' },
  valueNumHC: { color: '#FFEB3B' },
  valueUnit: { fontSize: 20, fontWeight: '600', color: '#1565C0' },
  
  ctrlBtn: {
    width: 80,
    height: 80,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1565C0',
  },
  ctrlBtnHC: { backgroundColor: '#FFEB3B', borderColor: '#FBC02D' },
  ctrlBtnDisabled: { backgroundColor: '#BDBDBD', borderColor: '#9E9E9E' },
  ctrlBtnTxt: { fontSize: 40, fontWeight: 'bold', color: '#FFFFFF' },
  ctrlBtnTxtHC: { color: '#000000' },
  ctrlBtnTxtDisabled: { color: '#E0E0E0' },
  
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  
  voiceSection: { marginBottom: 20 },
  voiceList: {},
  voiceBtn: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 12,
    borderWidth: 3,
    borderColor: '#90CAF9',
    minHeight: 70,
    justifyContent: 'center',
  },
  voiceBtnSel: { backgroundColor: '#2196F3', borderColor: '#1565C0' },
  voiceBtnSelHC: { backgroundColor: '#FFEB3B', borderColor: '#FBC02D' },
  voiceTxt: { fontSize: 22, color: '#1565C0', fontWeight: '600', textAlign: 'center' },
  voiceTxtSel: { color: '#FFFFFF', fontWeight: 'bold' },
  voiceTxtSelHC: { color: '#000000' },
  
  actionBtn: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 3,
    minHeight: 70,
  },
  actionBtnHC: { backgroundColor: '#FFEB3B', borderColor: '#FBC02D' },
  actionTxt: { fontSize: 24, fontWeight: 'bold', color: '#000000' },
  actionTxtHC: { color: '#000000' },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 22, color: '#666666', fontWeight: '600' },
  infoValue: { fontSize: 22, color: '#333333', fontWeight: '600' },
  
  textHC: { color: '#FFFFFF' },
});