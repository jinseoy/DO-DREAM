import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MMKVTestScreen from './src/screens/MMKVTestScreen';

export default function App() {
  return (
    <>
      <MMKVTestScreen />
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </>
  );
}
