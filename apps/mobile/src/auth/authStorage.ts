import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'curateds.auth.tokens';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  /** Epoch ms at which `accessToken` expires. */
  expiresAt: number;
};

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;
    if (
      typeof parsed.accessToken === 'string' &&
      typeof parsed.refreshToken === 'string' &&
      typeof parsed.idToken === 'string' &&
      typeof parsed.expiresAt === 'number'
    ) {
      return parsed as StoredTokens;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
