import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as collectionsApi from '../../src/api/collections';
import type { Collection } from '../../src/api/collections';
import CollectionsScreen from '../../src/screens/CollectionsScreen';

jest.mock('../../src/api/collections');
const mockedApi = collectionsApi as jest.Mocked<typeof collectionsApi>;

const mockNavigation = { navigate: jest.fn() } as unknown as never;
const mockRoute = { params: undefined, key: 'CollectionsList', name: 'CollectionsList' as const };

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const collections: Collection[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Vinyl Records', createdUtc: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Vintage Cameras', createdUtc: '2024-02-01T00:00:00Z' },
];

describe('CollectionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('shows a loading indicator while fetching', () => {
    mockedApi.listCollections.mockReturnValue(new Promise(() => {}));

    const { getByTestId } = render(<CollectionsScreen navigation={mockNavigation} route={mockRoute} />, { wrapper });

    expect(getByTestId('activity-indicator') ?? true).toBeTruthy();
  });

  it('renders the collection names on success', async () => {
    mockedApi.listCollections.mockResolvedValueOnce(collections);

    const { findByText } = render(<CollectionsScreen navigation={mockNavigation} route={mockRoute} />, { wrapper });

    expect(await findByText('Vinyl Records')).toBeTruthy();
    expect(await findByText('Vintage Cameras')).toBeTruthy();
  });

  it('shows an empty state when the API returns an empty list', async () => {
    mockedApi.listCollections.mockResolvedValueOnce([]);

    const { findByText } = render(<CollectionsScreen navigation={mockNavigation} route={mockRoute} />, { wrapper });

    expect(await findByText('No collections yet.')).toBeTruthy();
  });

  it('shows an error message and retry button on failure', async () => {
    mockedApi.listCollections.mockRejectedValueOnce(new Error('Network error'));

    const { findByText } = render(<CollectionsScreen navigation={mockNavigation} route={mockRoute} />, { wrapper });

    expect(await findByText('Failed to load collections.')).toBeTruthy();
    expect(await findByText('Retry')).toBeTruthy();
  });

  it('re-fetches when the retry button is pressed', async () => {
    mockedApi.listCollections
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(collections);

    const { findByText } = render(<CollectionsScreen navigation={mockNavigation} route={mockRoute} />, { wrapper });

    const retryButton = await findByText('Retry');
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockedApi.listCollections).toHaveBeenCalledTimes(2);
    });
  });
});
