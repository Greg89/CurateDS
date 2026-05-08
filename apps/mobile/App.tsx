import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { setTokenProvider } from './src/api/client';
import { queryClient } from './src/api/queryClient';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
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
      <RootTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootRouter />
        <StatusBar style="auto" />
      </AuthProvider>
    </QueryClientProvider>
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
