import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../../src/auth/AuthContext';
import * as auth0Client from '../../src/auth/auth0Client';
import * as authStorage from '../../src/auth/authStorage';
import type { StoredTokens } from '../../src/auth/authStorage';

jest.mock('../../src/auth/authStorage');
jest.mock('../../src/auth/auth0Client');

const mockedStorage = authStorage as jest.Mocked<typeof authStorage>;
const mockedClient = auth0Client as jest.Mocked<typeof auth0Client>;

// id token payload: { sub: 'auth0|abc', name: 'Ada Lovelace', email: 'ada@example.com' }
const fakeIdToken =
  'header.' +
  Buffer.from(
    JSON.stringify({ sub: 'auth0|abc', name: 'Ada Lovelace', email: 'ada@example.com' }),
  ).toString('base64url') +
  '.signature';

const validTokens: StoredTokens = {
  accessToken: 'access-valid',
  refreshToken: 'refresh-1',
  idToken: fakeIdToken,
  expiresAt: Date.now() + 60_000,
};

const expiredTokens: StoredTokens = {
  ...validTokens,
  accessToken: 'access-expired',
  expiresAt: Date.now() - 60_000,
};

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts signed out when secure storage is empty', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('signedOut'));
    expect(result.current.profile).toBeNull();
  });

  it('hydrates the profile from a stored id token', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(validTokens);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('signedIn'));
    expect(result.current.profile).toEqual({
      sub: 'auth0|abc',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
  });

  it('signIn delegates to auth0Client and persists the result', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(null);
    mockedClient.login.mockResolvedValueOnce(validTokens);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('signedOut'));

    await act(async () => {
      await result.current.signIn();
    });

    expect(mockedClient.login).toHaveBeenCalledTimes(1);
    expect(mockedStorage.saveTokens).toHaveBeenCalledWith(validTokens);
    await waitFor(() => expect(result.current.state).toBe('signedIn'));
  });

  it('signOut clears storage and returns to the signed-out state', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(validTokens);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('signedIn'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockedStorage.clearTokens).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('signedOut');
    expect(result.current.profile).toBeNull();
  });

  it('getAccessToken returns the cached access token while it is still valid', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(validTokens);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('signedIn'));

    const token = await result.current.getAccessToken();

    expect(token).toBe('access-valid');
    expect(mockedClient.refresh).not.toHaveBeenCalled();
  });

  it('getAccessToken refreshes when the cached access token is expired', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(expiredTokens);
    const refreshed: StoredTokens = {
      ...validTokens,
      accessToken: 'access-refreshed',
      refreshToken: 'refresh-2',
    };
    mockedClient.refresh.mockResolvedValueOnce(refreshed);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('signedIn'));

    let token: string | null = null;
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(mockedClient.refresh).toHaveBeenCalledWith('refresh-1');
    expect(mockedStorage.saveTokens).toHaveBeenCalledWith(refreshed);
    expect(token).toBe('access-refreshed');
  });

  it('signs the user out when refresh fails', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(expiredTokens);
    mockedClient.refresh.mockRejectedValueOnce(new Error('refresh denied'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('signedIn'));

    let token: string | null = 'unset';
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBeNull();
    await waitFor(() => expect(result.current.state).toBe('signedOut'));
    expect(mockedStorage.clearTokens).toHaveBeenCalled();
  });
});
