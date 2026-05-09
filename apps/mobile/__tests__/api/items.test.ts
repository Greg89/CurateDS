import {
  deleteItem,
  deleteItemMedia,
  getItemDetail,
  listItemEvents,
  listItems,
  setPrimaryItemMedia,
  updateItem,
} from '../../src/api/items';
import * as client from '../../src/api/client';

jest.mock('../../src/api/client');
const mockedApiFetch = client.apiFetch as jest.MockedFunction<typeof client.apiFetch>;

const rawItem = {
  id: '11111111-1111-1111-1111-111111111111',
  collectionId: '22222222-2222-2222-2222-222222222222',
  name: 'Canon AE-1',
  description: 'Classic 35mm film camera',
  quantity: 1,
  locationId: '33333333-3333-3333-3333-333333333333',
  locationName: 'Camera shelf',
  tags: ['film', 'vintage'],
  attributeValueCount: 3,
  createdUtc: '2024-01-01T00:00:00Z',
  updatedUtc: null,
  primaryImageUrl: null,
};

const pagedResponse = {
  items: [rawItem],
  totalCount: 1,
  page: 1,
  pageSize: 50,
  totalPages: 1,
};

describe('listItems', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the correct endpoint and returns parsed items', async () => {
    mockedApiFetch.mockResolvedValueOnce(pagedResponse);

    const items = await listItems('22222222-2222-2222-2222-222222222222');

    expect(mockedApiFetch).toHaveBeenCalledWith('/collections/22222222-2222-2222-2222-222222222222/items');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Canon AE-1');
    expect(items[0].tags).toEqual(['film', 'vintage']);
  });

  it('returns an empty array when the page has no items', async () => {
    mockedApiFetch.mockResolvedValueOnce({ ...pagedResponse, items: [], totalCount: 0 });

    const items = await listItems('22222222-2222-2222-2222-222222222222');

    expect(items).toHaveLength(0);
  });

  it('throws when the response shape is invalid', async () => {
    mockedApiFetch.mockResolvedValueOnce({ notAPagedResponse: true });

    await expect(listItems('22222222-2222-2222-2222-222222222222')).rejects.toThrow();
  });
});

const rawDetail = {
  id: '11111111-1111-1111-1111-111111111111',
  collectionId: '22222222-2222-2222-2222-222222222222',
  name: 'Canon AE-1',
  description: null,
  quantity: 1,
  locationId: null,
  locationName: null,
  itemTypeId: null,
  tags: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'film' }],
  createdUtc: '2024-01-01T00:00:00Z',
  updatedUtc: null,
  attributeValues: [],
  mediaAssets: [],
};

describe('getItemDetail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the correct endpoint and returns parsed detail', async () => {
    mockedApiFetch.mockResolvedValueOnce(rawDetail);

    const item = await getItemDetail('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/collections/22222222-2222-2222-2222-222222222222/items/11111111-1111-1111-1111-111111111111',
    );
    expect(item.name).toBe('Canon AE-1');
    expect(item.tags[0].name).toBe('film');
  });

  it('throws when the response shape is invalid', async () => {
    mockedApiFetch.mockResolvedValueOnce({ notAnItem: true });

    await expect(
      getItemDetail('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
    ).rejects.toThrow();
  });
});

const updateInput = {
  name: 'Canon AE-1 Updated',
  description: 'Updated description',
  quantity: 2,
  locationId: null,
  itemTypeId: null,
  tagIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  attributeValues: [],
};

describe('updateItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls PUT on the correct endpoint and returns parsed item detail', async () => {
    mockedApiFetch.mockResolvedValueOnce({ ...rawDetail, name: 'Canon AE-1 Updated' });

    const item = await updateItem(
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111',
      updateInput,
    );

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/collections/22222222-2222-2222-2222-222222222222/items/11111111-1111-1111-1111-111111111111',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(item.name).toBe('Canon AE-1 Updated');
  });

  it('throws when the response shape is invalid', async () => {
    mockedApiFetch.mockResolvedValueOnce({ bad: true });

    await expect(
      updateItem('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', updateInput),
    ).rejects.toThrow();
  });
});

describe('deleteItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls DELETE on the correct endpoint', async () => {
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await deleteItem('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/collections/22222222-2222-2222-2222-222222222222/items/11111111-1111-1111-1111-111111111111',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

const rawEvent = {
  id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  itemId: '11111111-1111-1111-1111-111111111111',
  collectionId: '22222222-2222-2222-2222-222222222222',
  eventType: 'Created',
  occurredUtc: '2024-01-01T00:00:00Z',
  occurredBy: 'user@example.com',
  notes: null,
};

describe('listItemEvents', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the correct endpoint and returns parsed events', async () => {
    mockedApiFetch.mockResolvedValueOnce([rawEvent]);

    const events = await listItemEvents(
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111',
    );

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/collections/22222222-2222-2222-2222-222222222222/items/11111111-1111-1111-1111-111111111111/events',
    );
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('Created');
    expect(events[0].notes).toBeNull();
  });

  it('returns an empty array when there are no events', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);

    const events = await listItemEvents(
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111',
    );

    expect(events).toHaveLength(0);
  });

  it('throws when the response shape is invalid', async () => {
    mockedApiFetch.mockResolvedValueOnce([{ bad: true }]);

    await expect(
      listItemEvents('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
    ).rejects.toThrow();
  });
});

describe('deleteItemMedia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls DELETE on the correct endpoint', async () => {
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await deleteItemMedia(
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
    );

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/collections/22222222-2222-2222-2222-222222222222/items/11111111-1111-1111-1111-111111111111/media/cccccccc-cccc-cccc-cccc-cccccccccccc',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('setPrimaryItemMedia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls PUT on the correct primary endpoint', async () => {
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await setPrimaryItemMedia(
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
    );

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/collections/22222222-2222-2222-2222-222222222222/items/11111111-1111-1111-1111-111111111111/media/cccccccc-cccc-cccc-cccc-cccccccccccc/primary',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
