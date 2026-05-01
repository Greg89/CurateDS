import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import * as WebBrowser from 'expo-web-browser';

import * as auth0Client from './auth0Client';
import { clearTokens, loadTokens, saveTokens, type StoredTokens } from './authStorage';
import { decodeIdToken, type Auth0Profile } from './profile';

export type AuthState = 'loading' | 'signedOut' | 'signedIn';

export type AuthContextValue = {
  state: AuthState;
  profile: Auth0Profile | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Returns a non-expired access token, refreshing if necessary. Returns null if the session cannot be recovered. */
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const REFRESH_LEEWAY_MS = 30_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');
  const [profile, setProfile] = useState<Auth0Profile | null>(null);
  const tokensRef = useRef<StoredTokens | null>(null);

  // Required for the OAuth redirect to close the browser after login.
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  const applyTokens = useCallback(async (tokens: StoredTokens) => {
    tokensRef.current = tokens;
    await saveTokens(tokens);
    setProfile(decodeIdToken(tokens.idToken));
    setState('signedIn');
  }, []);

  const clearSession = useCallback(async () => {
    tokensRef.current = null;
    await clearTokens();
    setProfile(null);
    setState('signedOut');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        console.log('[AuthContext] hydrating from secure storage…');
        const stored = await loadTokens();
        if (cancelled) {
          return;
        }
        if (stored) {
          console.log('[AuthContext] tokens found, signing in');
          tokensRef.current = stored;
          setProfile(decodeIdToken(stored.idToken));
          setState('signedIn');
        } else {
          console.log('[AuthContext] no tokens, signed out');
          setState('signedOut');
        }
      } catch (err) {
        console.error('[AuthContext] hydration failed:', err);
        if (!cancelled) {
          setState('signedOut');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async () => {
    const tokens = await auth0Client.login();
    await applyTokens(tokens);
  }, [applyTokens]);

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const getAccessToken = useCallback(async () => {
    const current = tokensRef.current;
    if (!current) {
      return null;
    }
    if (current.expiresAt - REFRESH_LEEWAY_MS > Date.now()) {
      return current.accessToken;
    }
    if (!current.refreshToken) {
      await clearSession();
      return null;
    }
    try {
      const refreshed = await auth0Client.refresh(current.refreshToken);
      await applyTokens(refreshed);
      return refreshed.accessToken;
    } catch {
      await clearSession();
      return null;
    }
  }, [applyTokens, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, profile, signIn, signOut, getAccessToken }),
    [state, profile, signIn, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return value;
}
