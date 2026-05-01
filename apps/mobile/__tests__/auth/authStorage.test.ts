import * as SecureStore from 'expo-secure-store';

import { clearTokens, loadTokens, saveTokens, type StoredTokens } from '../../src/auth/authStorage';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const sampleTokens: StoredTokens = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  idToken: 'id-789',
  expiresAt: 1_700_000_000_000,
};

describe('authStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists tokens as a single secure-store entry', async () => {
    await saveTokens(sampleTokens);

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    const [key, payload] = mockedSecureStore.setItemAsync.mock.calls[0];
    expect(key).toBe('curateds.auth.tokens');
    expect(JSON.parse(payload as string)).toEqual(sampleTokens);
  });

  it('returns null when no tokens are stored', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce(null);

    await expect(loadTokens()).resolves.toBeNull();
  });

  it('round-trips stored tokens', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(sampleTokens));

    await expect(loadTokens()).resolves.toEqual(sampleTokens);
  });

  it('returns null when stored payload is corrupt', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce('not-json');

    await expect(loadTokens()).resolves.toBeNull();
  });

  it('clears tokens via deleteItemAsync', async () => {
    await clearTokens();

    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('curateds.auth.tokens');
  });
});
