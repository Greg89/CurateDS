import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as itemsApi from '../../src/api/items';
import type { ItemDetail } from '../../src/api/items';
import ItemDetailScreen from '../../src/screens/ItemDetailScreen';

jest.mock('../../src/api/items');
const mockedApi = itemsApi as jest.Mocked<typeof itemsApi>;

const mockRoute = {
  params: {
    collectionId: '22222222-2222-2222-2222-222222222222',
    itemId: '11111111-1111-1111-1111-111111111111',
    itemName: 'Canon AE-1',
  },
  key: 'ItemDetail',
  name: 'ItemDetail' as const,
};
const mockNavigation = {} as never;

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const fullItem: ItemDetail = {
  id: '11111111-1111-1111-1111-111111111111',
  collectionId: '22222222-2222-2222-2222-222222222222',
  name: 'Canon AE-1',
  description: 'Classic 35mm film camera from 1976',
  quantity: 1,
  locationId: '33333333-3333-3333-3333-333333333333',
  locationName: 'Camera shelf',
  itemTypeId: null,
  tags: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'film' }],
  createdUtc: '2024-01-15T10:00:00Z',
  updatedUtc: null,
  attributeValues: [
    {
      attributeDefinitionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      attributeName: 'Year',
      attributeKey: 'year',
      dataType: 'Text',
      value: '1976',
    },
  ],
  mediaAssets: [
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      url: 'https://example.com/photo.jpg',
      contentType: 'image/jpeg',
      fileName: 'photo.jpg',
      sizeBytes: 204800,
      isPrimary: true,
      uploadedUtc: '2024-01-15T10:00:00Z',
    },
  ],
};

describe('ItemDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('shows a loading indicator while fetching', () => {
    mockedApi.getItemDetail.mockReturnValue(new Promise(() => {}));

    const { getByTestId } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(getByTestId('item-detail-activity-indicator')).toBeTruthy();
  });

  it('renders item name, description, and location on success', async () => {
    mockedApi.getItemDetail.mockResolvedValueOnce(fullItem);

    const { findByText } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Canon AE-1')).toBeTruthy();
    expect(await findByText('Classic 35mm film camera from 1976')).toBeTruthy();
    expect(await findByText('Camera shelf')).toBeTruthy();
  });

  it('renders attribute values', async () => {
    mockedApi.getItemDetail.mockResolvedValueOnce(fullItem);

    const { findByText } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Year')).toBeTruthy();
    expect(await findByText('1976')).toBeTruthy();
  });

  it('renders tags', async () => {
    mockedApi.getItemDetail.mockResolvedValueOnce(fullItem);

    const { findByText } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('film')).toBeTruthy();
  });

  it('shows error state on fetch failure', async () => {
    mockedApi.getItemDetail.mockRejectedValueOnce(new Error('Network error'));

    const { findByText } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Failed to load item.')).toBeTruthy();
  });
});
