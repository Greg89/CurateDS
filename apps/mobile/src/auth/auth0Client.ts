import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import type { StoredTokens } from './authStorage';

// NOTE: maybeCompleteAuthSession() must NOT be called at module scope.
// It is called inside AuthProvider via useEffect (see AuthContext.tsx).

type Auth0Config = {
  domain: string;
  clientId: string;
  audience: string;
  scopes: string[];
};

function readConfig(): Auth0Config {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const auth0 = (extra.auth0 ?? {}) as Record<string, unknown>;
  const domain = typeof auth0.domain === 'string' ? auth0.domain : '';
  const clientId = typeof auth0.clientId === 'string' ? auth0.clientId : '';
  const audience = typeof auth0.audience === 'string' ? auth0.audience : '';
  if (!domain || !clientId || !audience) {
    throw new Error(
      'Auth0 configuration is missing. Set expo.extra.auth0.{domain,clientId,audience} in app.config.ts.',
    );
  }
  return {
    domain,
    clientId,
    audience,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
  };
}

function discovery(domain: string): AuthSession.DiscoveryDocument {
  return {
    authorizationEndpoint: `https://${domain}/authorize`,
    tokenEndpoint: `https://${domain}/oauth/token`,
    revocationEndpoint: `https://${domain}/oauth/revoke`,
  };
}

function redirectUri(): string {
  return AuthSession.makeRedirectUri({ scheme: 'curateds', path: 'redirect' });
}

function tokensFromResponse(response: AuthSession.TokenResponse, fallbackRefresh?: string): StoredTokens {
  const accessToken = response.accessToken;
  const refreshToken = response.refreshToken ?? fallbackRefresh ?? '';
  const idToken = response.idToken ?? '';
  const expiresInSeconds = response.expiresIn ?? 0;
  const issuedAtSeconds = response.issuedAt ?? Math.floor(Date.now() / 1000);
  const expiresAt = (issuedAtSeconds + expiresInSeconds) * 1000;
  return { accessToken, refreshToken, idToken, expiresAt };
}

export async function login(): Promise<StoredTokens> {
  const config = readConfig();
  const redirect = redirectUri();
  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri: redirect,
    scopes: config.scopes,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { audience: config.audience },
  });
  const result = await request.promptAsync(discovery(config.domain));
  if (result.type !== 'success' || !result.params.code) {
    throw new Error(`Auth0 login did not complete (${result.type}).`);
  }
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: config.clientId,
      code: result.params.code,
      redirectUri: redirect,
      extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
    },
    discovery(config.domain),
  );
  return tokensFromResponse(tokenResponse);
}

export async function refresh(refreshToken: string): Promise<StoredTokens> {
  const config = readConfig();
  const tokenResponse = await AuthSession.refreshAsync(
    { clientId: config.clientId, refreshToken },
    discovery(config.domain),
  );
  return tokensFromResponse(tokenResponse, refreshToken);
}

export async function logout(): Promise<void> {
  const config = readConfig();
  const url = `https://${config.domain}/v2/logout?client_id=${encodeURIComponent(config.clientId)}&returnTo=${encodeURIComponent(redirectUri())}`;
  try {
    await WebBrowser.openAuthSessionAsync(url, redirectUri());
  } catch {
    // Federated logout is best-effort; local token clearance still happens via AuthContext.
  }
}
