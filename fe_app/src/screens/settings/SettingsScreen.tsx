import React, { useState, useEffect, useCallback, useContext } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import ttsService from "../../services/ttsService";
import { useAuthStore } from "../../stores/authStore";
import { useAppSettingsStore } from "../../stores/appSettingsStore";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import BackButton from "../../components/BackButton";
import { commonStyles } from "../../styles/commonStyles";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const logout = useAuthStore((state) => state.logout);

  const settings = useAppSettingsStore((state) => state.settings);
  const setTTSRate = useAppSettingsStore((state) => state.setTTSRate);
  const setTTSPitch = useAppSettingsStore((state) => state.setTTSPitch);
  const setTTSVolume = useAppSettingsStore((state) => state.setTTSVolume);
  const setTTSVoiceId = useAppSettingsStore((state) => state.setTTSVoiceId);
  const setHighContrastMode = useAppSettingsStore(
    (state) => state.setHighContrastMode
  );
  const setFontSizeScale = useAppSettingsStore(
    (state) => state.setFontSizeScale
  );
  const resetSettings = useAppSettingsStore((state) => state.resetSettings);

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  const [availableVoices, setAvailableVoices] = useState<
    {
      id: string;
      name: string;
      language: string;
      quality: number;
      default?: boolean;
    }[]
  >([]);

  const [isTestingTts, setIsTestingTts] = useState(false);

  useEffect(() => {
    const loadVoices = async () => {
      const voices = await ttsService.getAvailableVoices();

      console.log(
        "[Settings] Original voices:",
        voices.map((v) => ({
          id: v.id,
          name: v.name,
          lang: v.language,
          q: v.quality,
        }))
      );

      // 1) 한국어 위주로 필터링 (없으면 전체 사용)
      let koVoices = voices.filter(
        (v) =>
          v.language?.toLowerCase().startsWith("ko") ||
          v.language?.toLowerCase().includes("ko-kr")
      );

      if (koVoices.length === 0) {
        koVoices = [...voices];
      }

      // 2) 품질 높은 순으로 정렬
      koVoices.sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0));

      // 3) 학습용에 어울리는 한글 이름으로 다시 라벨링
      const friendlyNames = [
        "집중 잘 되는 기본 목소리",
        "조용하고 차분한 목소리",
        "또렷한 선생님 목소리",
        "부드러운 설명용 목소리",
      ];

      const renamed = koVoices.slice(0, 4).map((v, idx) => ({
        ...v,
        name: friendlyNames[idx] ?? `공부용 목소리 ${idx + 1}`,
      }));

      setAvailableVoices(renamed);

      // 저장된 음성이 없다면 첫 번째 음성을 기본값으로
      if (!settings.ttsVoiceId && renamed.length > 0) {
        handleVoiceChange(renamed[0].id);
      }
    };

    loadVoices();

    // 화면 unmount 시 TTS 샘플 정지
    return () => {
      console.log("[SettingsScreen] Cleanup - TTS 샘플 정지");
      ttsService.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 화면 이탈 시 TTS 샘플 완전 정지 (네비게이션 감지)
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async () => {
      console.log("[SettingsScreen] 화면 이탈 감지 - TTS 샘플 정지");
      await ttsService.stop();
    });

    return unsubscribe;
  }, [navigation]);

  // 각 설정별 핸들러 (Store 액션 호출 + TTS 서비스 적용)
  const handleRateChange = useCallback(
    async (rate: number) => {
      setTTSRate(rate);
      await ttsService.setRate(rate);
      AccessibilityInfo.announceForAccessibility(`${rate.toFixed(1)}배`);
      ttsService.speakSample("현재 속도로 재생됩니다.");
    },
    [setTTSRate]
  );

  const handlePitchChange = useCallback(
    async (pitch: number) => {
      setTTSPitch(pitch);
      await ttsService.setPitch(pitch);
      AccessibilityInfo.announceForAccessibility(
        `높낮이 ${pitch.toFixed(1)}로 설정되었습니다.`
      );
      ttsService.speakSample("현재 높낮이로 재생됩니다.");
    },
    [setTTSPitch]
  );

  const handleVolumeChange = useCallback(
    (volume: number) => {
      setTTSVolume(volume);
      ttsService.setVolume(volume);
      AccessibilityInfo.announceForAccessibility(
        `${Math.round(volume * 100)}퍼센트`
      );
      ttsService.speakSample("현재 볼륨으로 재생됩니다.");
    },
    [setTTSVolume]
  );

  const handleVoiceChange = useCallback(
    async (voiceId: string) => {
      setTTSVoiceId(voiceId);
      await ttsService.setVoice(voiceId);
      const voiceName =
        availableVoices.find((v) => v.id === voiceId)?.name || "선택됨";
      AccessibilityInfo.announceForAccessibility(
        `${voiceName}으로 변경되었습니다.`
      );
      // 샘플 음성 재생
      ttsService.speakSample("현재 목소리로 재생됩니다.");
    },
    [setTTSVoiceId, availableVoices]
  );

  const handleHighContrastChange = useCallback(
    (enabled: boolean) => {
      setHighContrastMode(enabled);
      AccessibilityInfo.announceForAccessibility(
        `고대비 모드 ${enabled ? "켜짐" : "꺼짐"}`
      );
    },
    [setHighContrastMode]
  );

  const handleFontSizeChange = useCallback(
    (scale: number) => {
      setFontSizeScale(scale);
      AccessibilityInfo.announceForAccessibility(
        `글자 크기 ${Math.round(scale * 100)}퍼센트`
      );
    },
    [setFontSizeScale]
  );

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
    Alert.alert("설정 초기화", "모든 설정을 기본값으로 되돌리시겠습니까?", [
      {
        text: "취소",
        style: "cancel",
        onPress: () =>
          AccessibilityInfo.announceForAccessibility("취소되었습니다."),
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
          AccessibilityInfo.announceForAccessibility(
            "모든 설정이 기본값으로 초기화되었습니다."
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
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
            HC && styles.textHC,
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
            <Text
              style={[
                styles.valueNum,
                { fontSize: (baseSize + 4) * scale },
                HC && styles.valueNumHC,
              ]}
            >
              {displayFormatter(value)}
            </Text>
            <Text
              style={[
                styles.valueUnit,
                { fontSize: (baseSize - 4) * scale },
                HC && styles.valueNumHC,
              ]}
            >
              {unit}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.ctrlBtn,
              value <= min && styles.ctrlBtnDisabled,
              HC && styles.ctrlBtnHC,
            ]}
            onPress={onDecrease}
            disabled={value <= min}
            accessible={true}
            accessibilityLabel="감소"
            accessibilityRole="button"
            accessibilityHint={`${label} 감소`}
            accessibilityState={{ disabled: value <= min }}
          >
            <Text
              style={[
                styles.ctrlBtnTxt,
                { fontSize: (baseSize + 16) * scale },
                value <= min && styles.ctrlBtnTxtDisabled,
                HC && styles.ctrlBtnTxtHC,
              ]}
            >
              −
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.ctrlBtn,
              value >= max && styles.ctrlBtnDisabled,
              HC && styles.ctrlBtnHC,
            ]}
            onPress={onIncrease}
            disabled={value >= max}
            accessible={true}
            accessibilityLabel="증가"
            accessibilityRole="button"
            accessibilityHint={`${label} 증가`}
            accessibilityState={{ disabled: value >= max }}
          >
            <Text
              style={[
                styles.ctrlBtnTxt,
                { fontSize: (baseSize + 16) * scale },
                value >= max && styles.ctrlBtnTxtDisabled,
                HC && styles.ctrlBtnTxtHC,
              ]}
            >
              +
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSwitch = (
    label: string,
    value: boolean,
    onChange: (v: boolean) => void
  ) => {
    const HC = settings.highContrastMode;
    const baseSize = 24;
    const scale = settings.fontSizeScale;

    return (
      <View style={styles.switchRow}>
        <Text
          style={[
            styles.controlLabel,
            { fontSize: baseSize * scale },
            HC && styles.textHC,
          ]}
        >
          {label}
        </Text>
        <Switch
          onValueChange={onChange}
          value={value}
          trackColor={{ false: "#9E9E9E", true: "#4CAF50" }}
          thumbColor={value ? "#FFFFFF" : "#F5F5F5"}
          style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
          accessible={true}
          accessibilityLabel={label}
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          accessibilityValue={{ text: value ? "켜짐" : "꺼짐" }}
        />
      </View>
    );
  };

  const renderAction = (
    label: string,
    onPress: () => void,
    bg: string,
    border: string
  ) => {
    const HC = settings.highContrastMode;
    const baseSize = 24;
    const scale = settings.fontSizeScale;

    return (
      <TouchableOpacity
        style={[
          styles.actionBtn,
          { backgroundColor: bg, borderColor: border },
          HC && styles.actionBtnHC,
        ]}
        onPress={onPress}
        accessible={true}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.actionTxt,
            { fontSize: baseSize * scale },
            HC && styles.actionTxtHC,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleGoBack = useCallback(() => {
    AccessibilityInfo.announceForAccessibility(
      "설정 화면을 닫고 이전 화면으로 돌아갑니다."
    );
    navigation.goBack();
  }, [navigation]);

  // SettingsScreen 전용 음성 명령 처리
  const handleSettingsVoiceCommand = useCallback(
    (spoken: string) => {
      const raw = spoken.trim();
      if (!raw) return;
      const t = raw.toLowerCase();
      const nospace = t.replace(/\s+/g, "");

      console.log("[VoiceCommands][Settings] spoken:", raw);

      // 1) 뒤로 가기
      if (nospace.includes("뒤로") || nospace.includes("이전화면")) {
        handleGoBack();
        return;
      }

      // 2) 재생 속도 (빠르게 / 느리게 / 기본 / 두 배 / 최고 / 최저)
      if (nospace.includes("속도")) {
        // 두 배 / 2배
        if (
          nospace.includes("두배") ||
          nospace.includes("2배") ||
          nospace.includes("두배속") ||
          nospace.includes("2배속")
        ) {
          handleRateChange(2.0);
          return;
        }

        // 반 배속 / 0.5배
        if (
          nospace.includes("반배") ||
          nospace.includes("0.5배") ||
          nospace.includes("0점5배") ||
          nospace.includes("영점오배")
        ) {
          handleRateChange(0.5);
          return;
        }

        // 최고/최대 속도
        if (
          nospace.includes("최고") ||
          nospace.includes("최대로") ||
          nospace.includes("최대속도") ||
          nospace.includes("가장빠")
        ) {
          handleRateChange(2.0);
          return;
        }

        // 최저/가장 느리게
        if (
          nospace.includes("최저") ||
          nospace.includes("최소속도") ||
          nospace.includes("가장느리")
        ) {
          handleRateChange(0.5);
          return;
        }

        // 상대적 조절 (조금 빠르게/느리게)
        if (
          nospace.includes("빠르") ||
          nospace.includes("빨리") ||
          nospace.includes("올려") ||
          nospace.includes("증가")
        ) {
          const next = Math.min(
            2.0,
            Number((settings.ttsRate + 0.1).toFixed(2))
          );
          handleRateChange(next);
        } else if (
          nospace.includes("느리") ||
          nospace.includes("천천히") ||
          nospace.includes("내려") ||
          nospace.includes("감소")
        ) {
          const next = Math.max(
            0.5,
            Number((settings.ttsRate - 0.1).toFixed(2))
          );
          handleRateChange(next);
        } else if (
          nospace.includes("기본") ||
          nospace.includes("처음") ||
          nospace.includes("한배")
        ) {
          handleRateChange(1.0);
        } else {
          AccessibilityInfo.announceForAccessibility(
            "재생 속도는 두 배, 반 배속, 최고 속도, 최저 속도, 빠르게, 느리게, 기본 속도처럼 말해 주세요."
          );
        }
        return;
      }

      // 3) 높낮이 / 톤 / 목소리 높이
      if (
        nospace.includes("높낮이") ||
        nospace.includes("톤") ||
        nospace.includes("음높이") ||
        nospace.includes("목소리높이")
      ) {
        // 최고 톤
        if (
          nospace.includes("최고") ||
          nospace.includes("최대로") ||
          nospace.includes("최대") ||
          nospace.includes("가장높")
        ) {
          handlePitchChange(2.0);
          return;
        }

        // 최저 톤
        if (
          nospace.includes("최저") ||
          nospace.includes("최소") ||
          nospace.includes("가장낮")
        ) {
          handlePitchChange(0.5);
          return;
        }

        if (
          nospace.includes("높게") ||
          nospace.includes("올려") ||
          nospace.includes("증가")
        ) {
          const next = Math.min(
            2.0,
            Number((settings.ttsPitch + 0.1).toFixed(2))
          );
          handlePitchChange(next);
        } else if (
          nospace.includes("낮게") ||
          nospace.includes("내려") ||
          nospace.includes("감소")
        ) {
          const next = Math.max(
            0.5,
            Number((settings.ttsPitch - 0.1).toFixed(2))
          );
          handlePitchChange(next);
        } else if (nospace.includes("기본") || nospace.includes("처음")) {
          handlePitchChange(1.0);
        } else {
          AccessibilityInfo.announceForAccessibility(
            "목소리 높이는 높게, 낮게, 최고, 최저, 기본처럼 말해 주세요."
          );
        }
        return;
      }

      // 4) 볼륨 / 소리 크기
      if (
        nospace.includes("볼륨") ||
        nospace.includes("소리") ||
        nospace.includes("음량")
      ) {
        // 최대/최고 볼륨
        if (
          nospace.includes("최대") ||
          nospace.includes("최대로") ||
          nospace.includes("최고") ||
          nospace.includes("가장크게")
        ) {
          handleVolumeChange(1.0);
          return;
        }

        // 최소/무음
        if (
          nospace.includes("최소") ||
          nospace.includes("최저") ||
          nospace.includes("무음") ||
          nospace.includes("묵음") ||
          nospace.includes("가장작")
        ) {
          handleVolumeChange(0.0);
          return;
        }

        if (
          nospace.includes("크게") ||
          nospace.includes("올려") ||
          nospace.includes("증가")
        ) {
          const next = Math.min(
            1.0,
            Number((settings.ttsVolume + 0.1).toFixed(2))
          );
          handleVolumeChange(next);
        } else if (
          nospace.includes("작게") ||
          nospace.includes("내려") ||
          nospace.includes("감소") ||
          nospace.includes("줄여")
        ) {
          const next = Math.max(
            0.0,
            Number((settings.ttsVolume - 0.1).toFixed(2))
          );
          handleVolumeChange(next);
        } else if (nospace.includes("기본") || nospace.includes("처음")) {
          handleVolumeChange(1.0);
        } else {
          AccessibilityInfo.announceForAccessibility(
            "볼륨은 크게, 작게, 최고, 최저, 기본처럼 말해 주세요."
          );
        }
        return;
      }

      // 5) 고대비 모드
      if (nospace.includes("고대비") || nospace.includes("반전")) {
        if (
          nospace.includes("켜") ||
          nospace.includes("온") ||
          nospace.includes("on")
        ) {
          if (settings.highContrastMode) {
            AccessibilityInfo.announceForAccessibility(
              "이미 고대비 모드가 켜져 있습니다."
            );
          } else {
            handleHighContrastChange(true);
          }
        } else if (
          nospace.includes("꺼") ||
          nospace.includes("오프") ||
          nospace.includes("off")
        ) {
          if (!settings.highContrastMode) {
            AccessibilityInfo.announceForAccessibility(
              "이미 고대비 모드가 꺼져 있습니다."
            );
          } else {
            handleHighContrastChange(false);
          }
        } else {
          // 토글
          handleHighContrastChange(!settings.highContrastMode);
        }
        return;
      }

      // 6) 글자 크기
      if (
        nospace.includes("글자") ||
        nospace.includes("글씨") ||
        nospace.includes("폰트")
      ) {
        if (nospace.includes("크게") || nospace.includes("키워")) {
          const next = Math.min(
            2.0,
            Number((settings.fontSizeScale + 0.1).toFixed(2))
          );
          handleFontSizeChange(next);
        } else if (
          nospace.includes("작게") ||
          nospace.includes("줄여") ||
          nospace.includes("작아")
        ) {
          const next = Math.max(
            0.8,
            Number((settings.fontSizeScale - 0.1).toFixed(2))
          );
          handleFontSizeChange(next);
        } else if (nospace.includes("기본") || nospace.includes("처음")) {
          handleFontSizeChange(1.0);
        } else {
          AccessibilityInfo.announceForAccessibility(
            "글자 크기는 크게, 작게, 기본처럼 말해 주세요."
          );
        }
        return;
      }

      // 7) 테스트 재생
      if (
        nospace.includes("테스트") ||
        nospace.includes("샘플") ||
        nospace.includes("들려줘") ||
        nospace.includes("틀어줘") ||
        nospace.includes("재생해")
      ) {
        handleTestTTS();
        return;
      }

      // 8) 초기화 / 기본값
      if (
        nospace.includes("초기화") ||
        nospace.includes("기본값") ||
        nospace.includes("처음상태")
      ) {
        handleResetSettings();
        return;
      }

      AccessibilityInfo.announceForAccessibility(
        "이 화면에서는 뒤로 가기, 재생 속도 빠르게 또는 느리게, 높낮이 높게 또는 낮게, 볼륨 크게 또는 작게, 고대비 모드 켜기 또는 끄기, 글자 크기 크게 또는 작게, 테스트 재생, 설정 초기화 같은 음성 명령을 사용할 수 있습니다."
      );
    },
    [
      settings.ttsRate,
      settings.ttsPitch,
      settings.ttsVolume,
      settings.highContrastMode,
      settings.fontSizeScale,
      handleGoBack,
      handleRateChange,
      handlePitchChange,
      handleVolumeChange,
      handleHighContrastChange,
      handleFontSizeChange,
      handleTestTTS,
      handleResetSettings,
    ]
  );

  // 전역 음성 명령 핸들러 등록
  useEffect(() => {
    setCurrentScreenId("Settings");

    registerVoiceHandlers("Settings", {
      goBack: handleGoBack,
      rawText: handleSettingsVoiceCommand,
    });

    const introTimer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(
        "설정 화면입니다. 상단의 음성 명령 버튼을 두 번 탭한 뒤, 재생 속도 빠르게, 볼륨 작게, 고대비 모드 켜기, 글자 크기 크게, 테스트 재생, 설정 초기화처럼 말하면 해당 기능이 실행됩니다."
      );
    }, 600);

    return () => {
      clearTimeout(introTimer);
      registerVoiceHandlers("Settings", {});
    };
  }, [
    setCurrentScreenId,
    registerVoiceHandlers,
    handleGoBack,
    handleSettingsVoiceCommand,
  ]);

  const HC = settings.highContrastMode;
  const baseSize = 24;
  const scale = settings.fontSizeScale;

  return (
    <SafeAreaView
      style={[styles.container, HC && styles.containerHC]}
      edges={["top"]}
    >
      {/* 상단 헤더: 뒤로가기 + 타이틀 + 음성 명령 버튼 */}
      <View style={[commonStyles.headerContainer, styles.header, HC && styles.headerHC]}>
        <BackButton
          onPress={handleGoBack}
          style={commonStyles.headerBackButton}
          textStyle={[
            // BackButton의 기본 텍스트 스타일을 가져와서 확장
            { fontSize: 20, color: "#2196F3", fontWeight: "600" },
            { fontSize: (baseSize + 4) * scale },
            HC && styles.textHC,
          ]}
        />

        <Text
          style={[
            styles.headerTitle,
            { fontSize: (baseSize + 8) * scale },
            HC && styles.textHC,
          ]}
          accessible={true}
          accessibilityRole="header"
        >
          설정
        </Text>

        <VoiceCommandButton
          style={commonStyles.headerVoiceButton}
          accessibilityHint="두 번 탭한 후 재생 속도, 높낮이, 볼륨, 고대비 모드, 글자 크기, 테스트 재생, 설정 초기화처럼 말하면 해당 기능이 실행됩니다."
        />
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
              HC && styles.textHC,
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            음성 설정
          </Text>

          {/* 재생 속도 */}
          {renderButtonControl(
            "재생 속도",
            settings.ttsRate,
            0.5,
            2.0,
            0.1,
            (v) => v.toFixed(1),
            "배",
            () =>
              handleRateChange(
                Math.max(0.5, Number((settings.ttsRate - 0.1).toFixed(2)))
              ),
            () =>
              handleRateChange(
                Math.min(2.0, Number((settings.ttsRate + 0.1).toFixed(2)))
              )
          )}

          {/* 높낮이 */}
          {renderButtonControl(
            "높낮이",
            settings.ttsPitch,
            0.5,
            2.0,
            0.1,
            (v) => v.toFixed(1),
            "",
            () =>
              handlePitchChange(
                Math.max(0.5, Number((settings.ttsPitch - 0.1).toFixed(2)))
              ),
            () =>
              handlePitchChange(
                Math.min(2.0, Number((settings.ttsPitch + 0.1).toFixed(2)))
              )
          )}

          {/* 볼륨 */}
          {renderButtonControl(
            "볼륨",
            settings.ttsVolume,
            0.0,
            1.0,
            0.1,
            (v) => Math.round(v * 100).toString(),
            "%",
            () =>
              handleVolumeChange(
                Math.max(0.0, Number((settings.ttsVolume - 0.1).toFixed(2)))
              ),
            () =>
              handleVolumeChange(
                Math.min(1.0, Number((settings.ttsVolume + 0.1).toFixed(2)))
              )
          )}

          {/* 음성 선택 */}
          <View style={styles.voiceSection}>
            <Text
              style={[
                styles.controlLabel,
                { fontSize: baseSize * scale },
                HC && styles.textHC,
              ]}
              accessible={true}
              accessibilityRole="header"
            >
              목소리
            </Text>

            <View style={styles.voiceList}>
              {availableVoices.map((voice) => {
                const isSelected = settings.ttsVoiceId === voice.id;
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
                    accessibilityState={{
                      selected: settings.ttsVoiceId === voice.id,
                    }}
                  >
                    <Text
                      style={[
                        styles.voiceTxt,
                        { fontSize: (baseSize - 2) * scale },
                        isSelected && styles.voiceTxtSel,
                        HC && isSelected && styles.voiceTxtSelHC,
                      ]}
                    >
                      {voice.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {renderAction(
            isTestingTts ? "재생 중..." : "테스트",
            handleTestTTS,
            isTestingTts ? "#4CAF50" : "#FFC107", // 재생 중일 때 녹색, 평상시 노란색
            isTestingTts ? "#388E3C" : "#FFA000"
          )}
        </View>

        <View style={[styles.section, HC && styles.sectionHC]}>
          <Text
            style={[
              styles.sectionTitle,
              { fontSize: (baseSize + 4) * scale },
              HC && styles.textHC,
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            화면 설정
          </Text>

          {renderSwitch(
            "고대비 모드",
            settings.highContrastMode,
            handleHighContrastChange
          )}

          {/* 글자 크기 */}
          {renderButtonControl(
            "글자 크기",
            settings.fontSizeScale,
            0.8,
            2.0,
            0.1,
            (v) => Math.round(v * 100).toString(),
            "%",
            () =>
              handleFontSizeChange(
                Math.max(0.8, Number((settings.fontSizeScale - 0.1).toFixed(2)))
              ),
            () =>
              handleFontSizeChange(
                Math.min(2.0, Number((settings.fontSizeScale + 0.1).toFixed(2)))
              )
          )}
        </View>

        <View style={[styles.section, HC && styles.sectionHC]}>
          <Text
            style={[
              styles.sectionTitle,
              { fontSize: (baseSize + 4) * scale },
              HC && styles.textHC,
            ]}
            accessible={true}
            accessibilityRole="header"
          >
            앱 정보
          </Text>

          <View style={styles.infoRow}>
            <Text
              style={[
                styles.infoLabel,
                { fontSize: (baseSize - 2) * scale },
                HC && styles.textHC,
              ]}
            >
              버전
            </Text>
            <Text
              style={[
                styles.infoValue,
                { fontSize: (baseSize - 2) * scale },
                HC && styles.textHC,
              ]}
            >
              1.0.0
            </Text>
          </View>

          {renderAction(
            "기본값으로 되돌리기",
            handleResetSettings,
            "#F44336",
            "#D32F2F"
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  containerHC: { backgroundColor: "#000000" },

  header: { borderBottomWidth: 3 },
  headerHC: { borderBottomColor: "#FFFFFF" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "bold",
    color: "#000000",
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60, flexGrow: 1 },

  section: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  sectionHC: { backgroundColor: "#1A1A1A", borderColor: "#FFFFFF" },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#BDBDBD",
  },

  controlGroup: { marginBottom: 28 },
  controlLabel: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 16,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  valueBox: {
    flex: 1,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 3,
    borderColor: "#2196F3",
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    minHeight: 80,
    gap: 6,
  },
  valueBoxHC: { backgroundColor: "#000000", borderColor: "#FFEB3B" },
  valueNum: { fontSize: 28, fontWeight: "bold", color: "#1565C0" },
  valueNumHC: { color: "#FFEB3B" },
  valueUnit: { fontSize: 20, fontWeight: "600", color: "#1565C0" },

  ctrlBtn: {
    width: 80,
    height: 80,
    backgroundColor: "#2196F3",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#1565C0",
  },
  ctrlBtnHC: { backgroundColor: "#FFEB3B", borderColor: "#FBC02D" },
  ctrlBtnDisabled: { backgroundColor: "#BDBDBD", borderColor: "#9E9E9E" },
  ctrlBtnTxt: { fontSize: 40, fontWeight: "bold", color: "#FFFFFF" },
  ctrlBtnTxtHC: { color: "#000000" },
  ctrlBtnTxtDisabled: { color: "#E0E0E0" },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },

  voiceSection: { marginBottom: 20 },
  voiceList: {},
  voiceBtn: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 12,
    borderWidth: 3,
    borderColor: "#90CAF9",
    minHeight: 70,
    justifyContent: "center",
  },
  voiceBtnSel: { backgroundColor: "#2196F3", borderColor: "#1565C0" },
  voiceBtnSelHC: { backgroundColor: "#FFEB3B", borderColor: "#FBC02D" },
  voiceTxt: {
    fontSize: 22,
    color: "#1565C0",
    fontWeight: "600",
    textAlign: "center",
  },
  voiceTxtSel: { color: "#FFFFFF", fontWeight: "bold" },
  voiceTxtSelHC: { color: "#000000" },

  actionBtn: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderWidth: 3,
    minHeight: 70,
  },
  actionBtnHC: { backgroundColor: "#FFEB3B", borderColor: "#FBC02D" },
  actionTxt: { fontSize: 24, fontWeight: "bold", color: "#000000" },
  actionTxtHC: { color: "#000000" },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: { fontSize: 22, color: "#666666", fontWeight: "600" },
  infoValue: { fontSize: 22, color: "#333333", fontWeight: "600" },

  textHC: { color: "#FFFFFF" },
});
