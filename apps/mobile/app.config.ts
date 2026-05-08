import type { ExpoConfig } from 'expo/config';
import base from './app.json' with { type: 'json' };

const baseConfig = base.expo as ExpoConfig;

export default (): ExpoConfig => ({
  ...baseConfig,
  extra: {
    ...(baseConfig.extra ?? {}),
    auth0: {
      domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? '',
      clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? '',
      audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE ?? '',
    },
  },
});
