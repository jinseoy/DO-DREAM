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
    const initialize = async () => {
      hydrateAuth();
      await hydrateSettings();

      const settings = useAppSettingsStore.getState().settings;

      await ttsService.syncWithSettings({
        rate: settings.ttsRate,
        pitch: settings.ttsPitch,
        volume: settings.ttsVolume,
        voiceId: settings.ttsVoiceId,
      });

      const accessToken = useAuthStore.getState().accessToken;

      await initFcm(
        () => useAuthStore.getState().accessToken,
        {
          registerOnInit: !!accessToken,
        }
      );
    };

    initialize();
  }, []);

  return (
    <TriggerProvider>
      <AppNavigator />
      <GlobalVoiceTriggers
        onVoiceCommand={() => {
          navigationRef.current?.navigate("Question" as never);
        }}
      />
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </TriggerProvider>
  );
}
