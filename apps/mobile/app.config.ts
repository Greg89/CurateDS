import type { ExpoConfig } from 'expo/config';

const base = require('./app.json') as { expo: ExpoConfig };

export default (): ExpoConfig => ({
  ...base.expo,
  extra: {
    ...(base.expo.extra ?? {}),
    auth0: {
      domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? '',
      clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? '',
      audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE ?? '',
    },
  },
});
