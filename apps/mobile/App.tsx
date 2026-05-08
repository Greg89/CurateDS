import { NavigationContainer } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { setTokenProvider } from './src/api/client';
import { asyncStoragePersister, queryClient } from './src/api/queryClient';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import OfflineBanner from './src/components/OfflineBanner';
import RootTabs from './src/navigation/RootTabs';
import SignInScreen from './src/screens/SignInScreen';

function RootRouter() {
  const { state, getAccessToken } = useAuth();

  useEffect(() => {
    setTokenProvider(getAccessToken);
  }, [getAccessToken]);

  if (state === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (state === 'signedOut') {
    return <SignInScreen />;
  }

  return (
    <NavigationContainer>
      <OfflineBanner />
      <RootTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <AuthProvider>
        <RootRouter />
        <StatusBar style="auto" />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

