import { fireEvent, render, waitFor } from '@testing-library/react-native';

import App from '../App';
import * as auth0Client from '../src/auth/auth0Client';
import * as authStorage from '../src/auth/authStorage';
import type { StoredTokens } from '../src/auth/authStorage';

jest.mock('../src/auth/authStorage');
jest.mock('../src/auth/auth0Client');

const mockedStorage = authStorage as jest.Mocked<typeof authStorage>;
const mockedClient = auth0Client as jest.Mocked<typeof auth0Client>;

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

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the sign-in screen when no tokens are stored', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(null);

    const { findByText } = render(<App />);

    expect(await findByText('CurateDS')).toBeTruthy();
    expect(await findByText('Sign in')).toBeTruthy();
  });

  it('shows the home screen with the profile claim once signed in', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(validTokens);

    const { findByText } = render(<App />);

    expect(await findByText('Ada Lovelace')).toBeTruthy();
    expect(await findByText('ada@example.com')).toBeTruthy();
  });

  it('moves from sign-in to home after a successful login', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(null);
    mockedClient.login.mockResolvedValueOnce(validTokens);

    const { findByText } = render(<App />);

    const signInButton = await findByText('Sign in');
    fireEvent.press(signInButton);

    await waitFor(async () => {
      expect(await findByText('Ada Lovelace')).toBeTruthy();
    });
  });
});
