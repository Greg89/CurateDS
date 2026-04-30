import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

const appVersion = Constants.expoConfig?.version ?? 'unknown';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CurateDS</Text>
      <Text style={styles.subtitle}>Mobile companion</Text>
      <View style={styles.meta}>
        <Text style={styles.metaLine}>v{appVersion}</Text>
        <Text style={styles.metaLine}>phase 0 scaffold</Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  meta: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  metaLine: {
    fontSize: 12,
    color: '#999',
  },
});
