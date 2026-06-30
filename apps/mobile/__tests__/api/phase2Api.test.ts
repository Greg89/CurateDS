import { listTags } from '../../src/api/tags';
import { listLocations } from '../../src/api/locations';
import { listAttributeDefinitions } from '../../src/api/attributeDefinitions';
import { createItem, uploadItemMedia } from '../../src/api/items';

jest.mock('../../src/api/client');
import * as client from '../../src/api/client';
const mockedFetch = client.apiFetch as jest.MockedFunction<typeof client.apiFetch>;

const TAG = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'film',
  key: 'film',
  createdUtc: '2026-01-01T00:00:00Z',
};

const LOCATION = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Camera shelf',
  description: null,
  createdUtc: '2026-01-01T00:00:00Z',
};

const ATTR_DEF = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  collectionId: '11111111-1111-4111-8111-111111111111',
  name: 'Year',
  key: 'year',
  dataType: 'Number',
  isRequired: true,
  isFilterable: false,
  sortOrder: 0,
  itemTypeId: null,
  createdUtc: '2026-01-01T00:00:00Z',
};

const ITEM_DETAIL = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  collectionId: '11111111-1111-4111-8111-111111111111',
  name: 'Canon AE-1',
  description: null,
  quantity: 1,
  locationId: null,
  locationName: null,
  itemTypeId: null,
  tags: [],
  createdUtc: '2026-01-01T00:00:00Z',
  updatedUtc: null,
  attributeValues: [],
  mediaAssets: [],
};

const MEDIA_ASSET = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  url: 'https://cdn.example.com/photo.jpg',
  contentType: 'image/jpeg',
  fileName: 'photo.jpg',
  sizeBytes: 204800,
  isPrimary: true,
  uploadedUtc: '2026-01-01T00:00:00Z',
};

beforeEach(() => jest.clearAllMocks());

describe('listTags', () => {
  it('calls GET /tags and returns parsed tags', async () => {
    mockedFetch.mockResolvedValueOnce([TAG]);
    const result = await listTags();
    expect(mockedFetch).toHaveBeenCalledWith('/tags');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('film');
  });

  it('returns empty array when no tags exist', async () => {
    mockedFetch.mockResolvedValueOnce([]);
    const result = await listTags();
    expect(result).toEqual([]);
  });

  it('throws on invalid shape', async () => {
    mockedFetch.mockResolvedValueOnce([{ id: 'not-a-uuid', name: 123 }]);
    await expect(listTags()).rejects.toThrow();
  });
});

describe('listLocations', () => {
  it('calls GET /locations and returns parsed locations', async () => {
    mockedFetch.mockResolvedValueOnce([LOCATION]);
    const result = await listLocations();
    expect(mockedFetch).toHaveBeenCalledWith('/locations');
    expect(result[0].name).toBe('Camera shelf');
    expect(result[0].description).toBeNull();
  });

  it('returns empty array when no locations exist', async () => {
    mockedFetch.mockResolvedValueOnce([]);
    const result = await listLocations();
    expect(result).toEqual([]);
  });
});

describe('listAttributeDefinitions', () => {
  it('calls GET /collections/:id/attribute-definitions and returns parsed defs', async () => {
    mockedFetch.mockResolvedValueOnce([ATTR_DEF]);
    const result = await listAttributeDefinitions('11111111-1111-4111-8111-111111111111');
    expect(mockedFetch).toHaveBeenCalledWith(
      '/collections/11111111-1111-4111-8111-111111111111/attribute-definitions',
    );
    expect(result[0].name).toBe('Year');
    expect(result[0].isRequired).toBe(true);
  });

  it('returns empty array when no definitions exist', async () => {
    mockedFetch.mockResolvedValueOnce([]);
    const result = await listAttributeDefinitions('11111111-1111-4111-8111-111111111111');
    expect(result).toEqual([]);
  });
});

describe('createItem', () => {
  it('calls POST /collections/:id/items with the correct body', async () => {
    mockedFetch.mockResolvedValueOnce(ITEM_DETAIL);
    const input = {
      name: 'Canon AE-1',
      description: '',
      quantity: 1,
      locationId: null,
      tagIds: [],
      attributeValues: [],
    };
    const result = await createItem('11111111-1111-4111-8111-111111111111', input);
    expect(mockedFetch).toHaveBeenCalledWith(
      '/collections/11111111-1111-4111-8111-111111111111/items',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.name).toBe('Canon AE-1');
  });

  it('returns parsed ItemDetail on success', async () => {
    mockedFetch.mockResolvedValueOnce(ITEM_DETAIL);
    const result = await createItem('11111111-1111-4111-8111-111111111111', {
      name: 'Canon AE-1',
      description: '',
      quantity: 1,
      locationId: null,
      tagIds: [],
      attributeValues: [],
    });
    expect(result.id).toBe(ITEM_DETAIL.id);
    expect(result.mediaAssets).toEqual([]);
  });

  it('throws on invalid response shape', async () => {
    mockedFetch.mockResolvedValueOnce({ id: 'bad' });
    await expect(
      createItem('11111111-1111-4111-8111-111111111111', {
        name: 'Canon AE-1',
        description: '',
        quantity: 1,
        locationId: null,
        tagIds: [],
        attributeValues: [],
      }),
    ).rejects.toThrow();
  });
});

describe('uploadItemMedia', () => {
  it('calls POST media endpoint and returns parsed MediaAsset', async () => {
    mockedFetch.mockResolvedValueOnce(MEDIA_ASSET);
    const result = await uploadItemMedia(
      '11111111-1111-4111-8111-111111111111',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'file:///tmp/photo.jpg',
      'photo.jpg',
      'image/jpeg',
    );
    expect(mockedFetch).toHaveBeenCalledWith(
      '/collections/11111111-1111-4111-8111-111111111111/items/dddddddd-dddd-4ddd-8ddd-dddddddddddd/media',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.isPrimary).toBe(true);
    expect(result.fileName).toBe('photo.jpg');
  });
});
