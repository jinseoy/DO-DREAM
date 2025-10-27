import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import LibraryScreen from './src/screens/LibraryScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <LibraryScreen />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});