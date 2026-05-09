import { fireEvent, render } from '@testing-library/react-native';

import ProfileScreen from '../../src/screens/ProfileScreen';
import * as authContext from '../../src/auth/AuthContext';

jest.mock('../../src/auth/AuthContext');
const mockedUseAuth = authContext.useAuth as jest.MockedFunction<typeof authContext.useAuth>;

const mockSignOut = jest.fn();

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user name and email when both are present', () => {
    mockedUseAuth.mockReturnValue({
      profile: { sub: 'auth0|1', name: 'Ada Lovelace', email: 'ada@example.com' },
      signOut: mockSignOut,
      state: 'signedIn',
      signIn: jest.fn(),
      getAccessToken: jest.fn(),
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Ada Lovelace')).toBeTruthy();
    expect(getByText('ada@example.com')).toBeTruthy();
    expect(getByText('Sign out')).toBeTruthy();
  });

  it('renders without name when profile has no name', () => {
    mockedUseAuth.mockReturnValue({
      profile: { sub: 'auth0|2', email: 'ada@example.com' },
      signOut: mockSignOut,
      state: 'signedIn',
      signIn: jest.fn(),
      getAccessToken: jest.fn(),
    });

    const { getByText, queryByText } = render(<ProfileScreen />);

    expect(getByText('ada@example.com')).toBeTruthy();
    expect(queryByText('Ada Lovelace')).toBeNull();
  });

  it('renders without email when profile has no email', () => {
    mockedUseAuth.mockReturnValue({
      profile: { sub: 'auth0|3', name: 'Ada Lovelace' },
      signOut: mockSignOut,
      state: 'signedIn',
      signIn: jest.fn(),
      getAccessToken: jest.fn(),
    });

    const { getByText, queryByText } = render(<ProfileScreen />);

    expect(getByText('Ada Lovelace')).toBeTruthy();
    expect(queryByText('ada@example.com')).toBeNull();
  });

  it('calls signOut when the sign out button is pressed', () => {
    mockedUseAuth.mockReturnValue({
      profile: { sub: 'auth0|1', name: 'Ada Lovelace', email: 'ada@example.com' },
      signOut: mockSignOut,
      state: 'signedIn',
      signIn: jest.fn(),
      getAccessToken: jest.fn(),
    });

    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('Sign out'));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
