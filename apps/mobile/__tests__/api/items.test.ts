import { getItemDetail, listItems } from '../../src/api/items';
import * as client from '../../src/api/client';

jest.mock('../../src/api/client');
const mockedApiFetch = client.apiFetch as jest.MockedFunction<typeof client.apiFetch>;

const rawItem = {
  id: '11111111-1111-4111-8111-111111111111',
  collectionId: '22222222-2222-4222-8222-222222222222',
  name: 'Canon AE-1',
  description: 'Classic 35mm film camera',
  quantity: 1,
  locationId: '33333333-3333-4333-8333-333333333333',
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

    const items = await listItems('22222222-2222-4222-8222-222222222222');

    expect(mockedApiFetch).toHaveBeenCalledWith('/collections/22222222-2222-4222-8222-222222222222/items');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Canon AE-1');
    expect(items[0].tags).toEqual(['film', 'vintage']);
  });

  it('returns an empty array when the page has no items', async () => {
    mockedApiFetch.mockResolvedValueOnce({ ...pagedResponse, items: [], totalCount: 0 });

    const items = await listItems('22222222-2222-4222-8222-222222222222');

    expect(items).toHaveLength(0);
  });

  it('throws when the response shape is invalid', async () => {
    mockedApiFetch.mockResolvedValueOnce({ notAPagedResponse: true });

    await expect(listItems('22222222-2222-4222-8222-222222222222')).rejects.toThrow();
  });
});

const rawDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  collectionId: '22222222-2222-4222-8222-222222222222',
  name: 'Canon AE-1',
  description: null,
  quantity: 1,
  locationId: null,
  locationName: null,
  itemTypeId: null,
  tags: [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'film',
      key: 'film',
      createdUtc: '2024-01-01T00:00:00Z',
    },
  ],
  createdUtc: '2024-01-01T00:00:00Z',
  updatedUtc: null,
  attributeValues: [],
  mediaAssets: [],
};

describe('getItemDetail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the correct endpoint and returns parsed detail', async () => {
    mockedApiFetch.mockResolvedValueOnce(rawDetail);

    const item = await getItemDetail('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/collections/22222222-2222-4222-8222-222222222222/items/11111111-1111-4111-8111-111111111111',
    );
    expect(item.name).toBe('Canon AE-1');
    expect(item.tags[0].name).toBe('film');
  });

  it('throws when the response shape is invalid', async () => {
    mockedApiFetch.mockResolvedValueOnce({ notAnItem: true });

    await expect(
      getItemDetail('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow();
  });
});
