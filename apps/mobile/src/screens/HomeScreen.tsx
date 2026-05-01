import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';

export default function HomeScreen() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Signed in as</Text>
      {profile?.name ? <Text style={styles.name}>{profile.name}</Text> : null}
      {profile?.email ? <Text style={styles.email}>{profile.email}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void signOut();
        }}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonLabel}>Sign out</Text>
      </Pressable>
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
  eyebrow: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  email: {
    marginTop: 4,
    fontSize: 16,
    color: '#666',
  },
  button: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
  },
  buttonPressed: {
    backgroundColor: '#f0f0f0',
  },
  buttonLabel: {
    color: '#111',
    fontSize: 14,
    fontWeight: '600',
  },
});
