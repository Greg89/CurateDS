import { listCollections } from '../../src/api/collections';
import * as client from '../../src/api/client';

jest.mock('../../src/api/client');
const mockedApiFetch = client.apiFetch as jest.MockedFunction<typeof client.apiFetch>;

const validCollections = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Vinyl Records', createdUtc: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Vintage Cameras', createdUtc: '2024-02-01T00:00:00Z' },
];

describe('listCollections', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /collections and returns parsed collections', async () => {
    mockedApiFetch.mockResolvedValueOnce(validCollections);

    const result = await listCollections();

    expect(mockedApiFetch).toHaveBeenCalledWith('/collections');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Vinyl Records');
    expect(result[1].id).toBe('22222222-2222-2222-2222-222222222222');
  });

  it('returns an empty array when the API returns an empty list', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);

    const result = await listCollections();

    expect(result).toHaveLength(0);
  });

  it('throws when the response shape is invalid', async () => {
    mockedApiFetch.mockResolvedValueOnce([{ notACollection: true }]);

    await expect(listCollections()).rejects.toThrow();
  });
});
