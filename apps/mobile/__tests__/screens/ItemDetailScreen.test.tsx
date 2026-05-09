import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { ReactNode } from 'react';

import * as itemsApi from '../../src/api/items';
import type { ItemDetail } from '../../src/api/items';
import ItemDetailScreen from '../../src/screens/ItemDetailScreen';

jest.mock('../../src/api/items');
const mockedApi = itemsApi as jest.Mocked<typeof itemsApi>;

jest.spyOn(Alert, 'alert');
const mockAlertAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

const mockRoute = {
  params: {
    collectionId: '22222222-2222-2222-2222-222222222222',
    itemId: '11111111-1111-1111-1111-111111111111',
    itemName: 'Canon AE-1',
  },
  key: 'ItemDetail',
  name: 'ItemDetail' as const,
};
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() } as unknown as never;

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

  it('shows retry button in error state and refetches on press', async () => {
    mockedApi.getItemDetail
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(fullItem);

    const { findByText } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    const retryButton = await findByText('Retry');
    fireEvent.press(retryButton);
    expect(await findByText('Canon AE-1')).toBeTruthy();
  });

  it('renders item without optional fields (no description, no location, no updatedUtc)', async () => {
    const minimalItem: ItemDetail = {
      ...fullItem,
      description: null,
      locationName: null,
      updatedUtc: null,
      tags: [],
      attributeValues: [],
      mediaAssets: [],
    };
    mockedApi.getItemDetail.mockResolvedValueOnce(minimalItem);

    const { findByText, queryByText } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Canon AE-1')).toBeTruthy();
    expect(queryByText('Classic 35mm film camera from 1976')).toBeNull();
    expect(queryByText('Camera shelf')).toBeNull();
    expect(queryByText('Tags')).toBeNull();
    expect(queryByText('Attributes')).toBeNull();
  });

  it('does not render updated row when updatedUtc is null', async () => {
    mockedApi.getItemDetail.mockResolvedValueOnce({ ...fullItem, updatedUtc: null });

    const { findByText, queryByText } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    await findByText('Canon AE-1');
    expect(queryByText('Updated')).toBeNull();
  });

  it('renders updated date when updatedUtc is present', async () => {
    mockedApi.getItemDetail.mockResolvedValueOnce({
      ...fullItem,
      updatedUtc: '2024-06-01T00:00:00Z',
    });

    const { findByText } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Updated')).toBeTruthy();
  });

  it('renders photo gallery section when there are multiple media assets', async () => {
    const itemWithPhotos: ItemDetail = {
      ...fullItem,
      mediaAssets: [
        { id: 'cc1', url: 'https://example.com/1.jpg', contentType: 'image/jpeg', fileName: '1.jpg', sizeBytes: 1000, isPrimary: true, uploadedUtc: '2024-01-01T00:00:00Z' },
        { id: 'cc2', url: 'https://example.com/2.jpg', contentType: 'image/jpeg', fileName: '2.jpg', sizeBytes: 1000, isPrimary: false, uploadedUtc: '2024-01-01T00:00:00Z' },
      ],
    };
    mockedApi.getItemDetail.mockResolvedValueOnce(itemWithPhotos);

    const { findByText } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Photos')).toBeTruthy();
  });

  it('pressing Edit navigates to EditItem screen', async () => {
    mockedApi.getItemDetail.mockResolvedValueOnce(fullItem);

    const { findByTestId } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    fireEvent.press(await findByTestId('edit-button'));

    expect((mockNavigation as any).navigate).toHaveBeenCalledWith('EditItem', {
      collectionId: '22222222-2222-2222-2222-222222222222',
      itemId: '11111111-1111-1111-1111-111111111111',
      itemName: 'Canon AE-1',
    });
  });

  it('pressing History navigates to ItemEvents screen', async () => {
    mockedApi.getItemDetail.mockResolvedValueOnce(fullItem);

    const { findByTestId } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    fireEvent.press(await findByTestId('history-button'));

    expect((mockNavigation as any).navigate).toHaveBeenCalledWith('ItemEvents', {
      collectionId: '22222222-2222-2222-2222-222222222222',
      itemId: '11111111-1111-1111-1111-111111111111',
      itemName: 'Canon AE-1',
    });
  });

  it('pressing Delete shows a confirmation alert', async () => {
    mockedApi.getItemDetail.mockResolvedValueOnce(fullItem);

    const { findByTestId } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    fireEvent.press(await findByTestId('delete-button'));

    expect(mockAlertAlert).toHaveBeenCalledWith(
      'Delete item',
      expect.stringContaining('Canon AE-1'),
      expect.any(Array),
    );
  });

  it('calls deleteItem and navigates back when Delete is confirmed', async () => {
    mockedApi.getItemDetail.mockResolvedValueOnce(fullItem);
    mockedApi.deleteItem.mockResolvedValueOnce(undefined);

    // Simulate pressing the destructive "Delete" button in the alert
    mockAlertAlert.mockImplementationOnce((_title, _msg, buttons) => {
      const destructive = (buttons as any[]).find((b) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    const { findByTestId } = render(
      <ItemDetailScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    fireEvent.press(await findByTestId('delete-button'));

    await waitFor(() => {
      expect(mockedApi.deleteItem).toHaveBeenCalledWith(
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
      );
      expect((mockNavigation as any).goBack).toHaveBeenCalled();
    });
  });
});
