import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/RootNavigation';
import GlobalVoiceTriggers from './src/components/GlobalVoiceTriggers';
import { TriggerProvider } from './src/triggers/TriggerContext';

export default function App() {
  return (
    <TriggerProvider>
      <AppNavigator />
      <GlobalVoiceTriggers
        onVoiceCommand={() => {
          navigationRef.current?.navigate('Question' as never);
        }}
      />
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </TriggerProvider>
  );
}
