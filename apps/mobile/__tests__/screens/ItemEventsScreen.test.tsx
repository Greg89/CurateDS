import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as itemsApi from '../../src/api/items';
import type { ItemEvent } from '../../src/api/items';
import ItemEventsScreen from '../../src/screens/ItemEventsScreen';

jest.mock('../../src/api/items');
const mockedApi = itemsApi as jest.Mocked<typeof itemsApi>;

const mockRoute = {
  params: {
    collectionId: '22222222-2222-2222-2222-222222222222',
    itemId: '11111111-1111-1111-1111-111111111111',
    itemName: 'Canon AE-1',
  },
  key: 'ItemEvents',
  name: 'ItemEvents' as const,
};
const mockNavigation = {} as never;

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const events: ItemEvent[] = [
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    itemId: '11111111-1111-1111-1111-111111111111',
    collectionId: '22222222-2222-2222-2222-222222222222',
    eventType: 'Created',
    occurredUtc: '2024-01-01T10:00:00Z',
    occurredBy: 'ada@example.com',
    notes: null,
  },
  {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    itemId: '11111111-1111-1111-1111-111111111111',
    collectionId: '22222222-2222-2222-2222-222222222222',
    eventType: 'Updated',
    occurredUtc: '2024-06-01T12:30:00Z',
    occurredBy: 'ada@example.com',
    notes: 'Fixed description',
  },
];

describe('ItemEventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => queryClient.clear());

  it('shows a loading indicator while fetching', () => {
    mockedApi.listItemEvents.mockReturnValue(new Promise(() => {}));

    const { getByTestId } = render(
      <ItemEventsScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(getByTestId('events-activity-indicator')).toBeTruthy();
  });

  it('renders event types and user on success', async () => {
    mockedApi.listItemEvents.mockResolvedValueOnce(events);

    const { findByText, findAllByText } = render(
      <ItemEventsScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Created')).toBeTruthy();
    expect(await findByText('Updated')).toBeTruthy();
    expect((await findAllByText('ada@example.com')).length).toBeGreaterThan(0);
  });

  it('renders notes when present', async () => {
    mockedApi.listItemEvents.mockResolvedValueOnce(events);

    const { findByText } = render(
      <ItemEventsScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Fixed description')).toBeTruthy();
  });

  it('does not render notes when null', async () => {
    mockedApi.listItemEvents.mockResolvedValueOnce([events[0]]); // Created, notes: null

    const { findByText, queryByText } = render(
      <ItemEventsScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    await findByText('Created');
    expect(queryByText('Fixed description')).toBeNull();
  });

  it('shows an empty state when there are no events', async () => {
    mockedApi.listItemEvents.mockResolvedValueOnce([]);

    const { findByText } = render(
      <ItemEventsScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('No history yet.')).toBeTruthy();
  });

  it('shows an error state on fetch failure', async () => {
    mockedApi.listItemEvents.mockRejectedValueOnce(new Error('Network error'));

    const { findByText } = render(
      <ItemEventsScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Failed to load history.')).toBeTruthy();
    expect(await findByText('Retry')).toBeTruthy();
  });

  it('refetches when retry is pressed', async () => {
    mockedApi.listItemEvents
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(events);

    const { findByText } = render(
      <ItemEventsScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    fireEvent.press(await findByText('Retry'));
    expect(await findByText('Created')).toBeTruthy();
  });

  it('uses human-readable labels for known event types', async () => {
    const allEventTypes: ItemEvent[] = [
      { ...events[0], id: '1', eventType: 'TagsChanged' },
      { ...events[0], id: '2', eventType: 'LocationChanged' },
      { ...events[0], id: '3', eventType: 'AttributesChanged' },
    ];
    mockedApi.listItemEvents.mockResolvedValueOnce(allEventTypes);

    const { findByText } = render(
      <ItemEventsScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    expect(await findByText('Tags changed')).toBeTruthy();
    expect(await findByText('Location changed')).toBeTruthy();
    expect(await findByText('Attributes changed')).toBeTruthy();
  });

  it('calls listItemEvents with the correct collection and item ids', async () => {
    mockedApi.listItemEvents.mockResolvedValueOnce(events);

    const { findByText } = render(
      <ItemEventsScreen route={mockRoute} navigation={mockNavigation} />,
      { wrapper },
    );

    await findByText('Created');

    expect(mockedApi.listItemEvents).toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111',
    );
  });
});
