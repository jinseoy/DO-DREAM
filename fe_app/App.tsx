import React, { useEffect } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import { navigationRef } from "./src/navigation/RootNavigation";
import GlobalVoiceTriggers from "./src/components/GlobalVoiceTriggers";
import { TriggerProvider } from "./src/triggers/TriggerContext"; 
import { useAppSettingsStore } from "./src/stores/appSettingsStore";
import { useAuthStore } from "./src/stores/authStore";
import ttsService from "./src/services/ttsService";
import { initFcm } from "./src/notifications/fcmService";

export default function App() {
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateSettings = useAppSettingsStore((state) => state.hydrate); 

  useEffect(() => {
    const initializeApp = async () => {
      // 스토리지에서 인증 정보와 설정 정보를 불러옵니다.
      hydrateAuth();
      await hydrateSettings();

      // 불러온 설정값으로 TTS 서비스를 동기화합니다.
      const currentSettings = useAppSettingsStore.getState().settings;
      await ttsService.syncWithSettings({
        rate: currentSettings.ttsRate,
        pitch: currentSettings.ttsPitch,
        volume: currentSettings.ttsVolume,
        voiceId: currentSettings.ttsVoiceId,
      });

      // FCM 초기화 (앱 시작 시 토큰 등록 생략 - Mock 모드에서)
      await initFcm({ registerOnInit: false });
    };

    initializeApp();
  }, [hydrateAuth, hydrateSettings]);

  return (
    <>
      <TriggerProvider>
        <AppNavigator />
        <GlobalVoiceTriggers
          onVoiceCommand={() => {
            navigationRef.current?.navigate("Question" as never);
          }}
        />
        <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      </TriggerProvider>
    </>
  );
}
