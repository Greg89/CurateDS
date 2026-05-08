import NetInfo from '@react-native-community/netinfo';
import { act, render } from '@testing-library/react-native';

import OfflineBanner from '../../src/components/OfflineBanner';

jest.mock('@react-native-community/netinfo');
const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

type NetInfoCallback = Parameters<typeof NetInfo.addEventListener>[0];

describe('OfflineBanner', () => {
  it('renders nothing when online', () => {
    mockedNetInfo.addEventListener.mockImplementation((cb: NetInfoCallback) => {
      cb({ isConnected: true } as Parameters<NetInfoCallback>[0]);
      return () => {};
    });

    const { queryByText } = render(<OfflineBanner />);

    expect(queryByText(/offline/i)).toBeNull();
  });

  it('shows the banner when offline', async () => {
    mockedNetInfo.addEventListener.mockImplementation((cb: NetInfoCallback) => {
      cb({ isConnected: false } as Parameters<NetInfoCallback>[0]);
      return () => {};
    });

    const { findByText } = render(<OfflineBanner />);

    expect(await findByText("You're offline — showing cached data")).toBeTruthy();
  });

  it('hides the banner when connection is restored', async () => {
    let capturedCb: NetInfoCallback | null = null;
    mockedNetInfo.addEventListener.mockImplementation((cb: NetInfoCallback) => {
      capturedCb = cb;
      cb({ isConnected: false } as Parameters<NetInfoCallback>[0]);
      return () => {};
    });

    const { queryByText, findByText } = render(<OfflineBanner />);
    expect(await findByText("You're offline — showing cached data")).toBeTruthy();

    act(() => {
      capturedCb?.({ isConnected: true } as Parameters<NetInfoCallback>[0]);
    });

    expect(queryByText("You're offline — showing cached data")).toBeNull();
  });
});
