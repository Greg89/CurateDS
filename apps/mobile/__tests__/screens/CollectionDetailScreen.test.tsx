import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as itemsApi from '../../src/api/items';
import type { ItemSummary } from '../../src/api/items';
import CollectionDetailScreen from '../../src/screens/CollectionDetailScreen';

jest.mock('../../src/api/items');
const mockedApi = itemsApi as jest.Mocked<typeof itemsApi>;

// Minimal navigation mocks required by the screen
const mockRoute = {
  params: { collectionId: '22222222-2222-2222-2222-222222222222', collectionName: 'Cameras' },
  key: 'CollectionDetail',
  name: 'CollectionDetail' as const,
};
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() } as unknown as never;

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const items: ItemSummary[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    collectionId: '22222222-2222-2222-2222-222222222222',
    name: 'Canon AE-1',
    description: 'Classic 35mm film camera',
    quantity: 1,
    locationId: '33333333-3333-3333-3333-333333333333',
    locationName: 'Camera shelf',
    tags: ['film', 'vintage'],
    attributeValueCount: 0,
    createdUtc: '2024-01-01T00:00:00Z',
    updatedUtc: null,
    primaryImageUrl: null,
  },
];

describe('CollectionDetailScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('shows a loading indicator while fetching', () => {
    mockedApi.listItems.mockResolvedValueOnce([]);

    const { getByTestId } = render(
      <CollectionDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(getByTestId('detail-activity-indicator')).toBeTruthy();
  });

  it('renders item names and metadata on success', async () => {
    mockedApi.listItems.mockResolvedValueOnce(items);

    const { findByText } = render(
      <CollectionDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Canon AE-1')).toBeTruthy();
    expect(await findByText('Classic 35mm film camera')).toBeTruthy();
    expect(await findByText('📍 Camera shelf')).toBeTruthy();
    expect(await findByText('Qty: 1')).toBeTruthy();
    expect(await findByText('film, vintage')).toBeTruthy();
  });

  it('shows empty state when items array is empty', async () => {
    mockedApi.listItems.mockResolvedValueOnce([]);

    const { findByText } = render(
      <CollectionDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('No items yet.')).toBeTruthy();
  });

  it('shows error state on fetch failure', async () => {
    mockedApi.listItems.mockRejectedValueOnce(new Error('Network error'));

    const { findByText } = render(
      <CollectionDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Failed to load items.')).toBeTruthy();
    expect(await findByText('Retry')).toBeTruthy();
  });
});
