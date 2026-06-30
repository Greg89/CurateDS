import NetInfo from '@react-native-community/netinfo';
import { act, render } from '@testing-library/react-native';

import OfflineBanner from '../../src/components/OfflineBanner';

jest.mock('@react-native-community/netinfo');
const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

type NetInfoCallback = Parameters<typeof NetInfo.addEventListener>[0];

describe('OfflineBanner', () => {
  it('renders nothing when online', async () => {
    mockedNetInfo.addEventListener.mockImplementation((cb: NetInfoCallback) => {
      cb({ isConnected: true } as Parameters<NetInfoCallback>[0]);
      return () => {};
    });

    const { queryByText } = await render(<OfflineBanner />);

    expect(queryByText(/offline/i)).toBeNull();
  });

  it('shows the banner when offline', async () => {
    mockedNetInfo.addEventListener.mockImplementation((cb: NetInfoCallback) => {
      cb({ isConnected: false } as Parameters<NetInfoCallback>[0]);
      return () => {};
    });

    const { findByText } = await render(<OfflineBanner />);

    expect(await findByText("You're offline — showing cached data")).toBeTruthy();
  });

  it('hides the banner when connection is restored', async () => {
    let capturedCb: NetInfoCallback | null = null;
    mockedNetInfo.addEventListener.mockImplementation((cb: NetInfoCallback) => {
      capturedCb = cb;
      cb({ isConnected: false } as Parameters<NetInfoCallback>[0]);
      return () => {};
    });

    const { queryByText, findByText } = await render(<OfflineBanner />);
    expect(await findByText("You're offline — showing cached data")).toBeTruthy();

    await act(() => {
      capturedCb?.({ isConnected: true } as Parameters<NetInfoCallback>[0]);
    });

    expect(queryByText("You're offline — showing cached data")).toBeNull();
  });
});
