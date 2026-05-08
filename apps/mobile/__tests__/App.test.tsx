import { fireEvent, render, waitFor } from '@testing-library/react-native';

import App from '../App';
import * as auth0Client from '../src/auth/auth0Client';
import * as authStorage from '../src/auth/authStorage';
import type { StoredTokens } from '../src/auth/authStorage';

jest.mock('../src/auth/authStorage');
jest.mock('../src/auth/auth0Client');
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, NavigationContainer: ({ children }: { children: React.ReactNode }) => children };
});
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ component: Component }: { component: React.ComponentType }) => <Component />,
  }),
}));
// Mock the whole stack so CollectionDetailScreen (which needs route params) is never rendered
jest.mock('../src/navigation/CollectionsStack', () => {
  const { Text } = require('react-native');
  return function CollectionsStack() {
    return <Text>Collections</Text>;
  };
});
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return { ...actual, useQuery: () => ({ data: [], isLoading: false, isError: false }) };
});

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

  it('shows the profile tab with user claim once signed in', async () => {
    mockedStorage.loadTokens.mockResolvedValueOnce(validTokens);

    const { findByText } = render(<App />);

    expect(await findByText('Ada Lovelace')).toBeTruthy();
    expect(await findByText('ada@example.com')).toBeTruthy();
  });

  it('moves from sign-in to the app after a successful login', async () => {
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
