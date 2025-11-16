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
      // 1) 스토리지에서 인증 정보와 설정 정보 불러오기
      hydrateAuth();
      await hydrateSettings();

      // 2) 불러온 설정값으로 TTS 서비스 동기화
      const currentSettings = useAppSettingsStore.getState().settings;
      await ttsService.syncWithSettings({
        rate: currentSettings.ttsRate,
        pitch: currentSettings.ttsPitch,
        volume: currentSettings.ttsVolume,
        voiceId: currentSettings.ttsVoiceId,
      });

      // 3) FCM 초기화
      //   - onTokenRefresh 리스너만 세팅
      //   - accessToken 체크는 fcmService 내부에서 처리
      const currentAccessToken = useAuthStore.getState().accessToken;

      await initFcm(
        // 항상 최신 accessToken을 가져오는 getter 함수
        () => useAuthStore.getState().accessToken,
        {
          // 이미 로그인된 상태로 앱을 켰다면, 이때 바로 토큰 한 번 등록
          registerOnInit: !!currentAccessToken,
        }
      );
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
