import { ApiError, apiFetch, setTokenProvider } from '../../src/api/client';

// Mock expo-constants to provide a fake apiBaseUrl
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: 'https://api.test',
        auth0: { domain: '', clientId: '', audience: '' },
      },
    },
  },
}));

const mockFetch = jest.fn<Promise<Response>, [RequestInfo, RequestInit?]>();
global.fetch = mockFetch as typeof fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('apiFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setTokenProvider(null as unknown as () => Promise<string | null>);
  });

  it('calls the correct URL with JSON headers', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: '1' }));

    await apiFetch('/collections');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/collections',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('injects the Bearer token from the token provider', async () => {
    setTokenProvider(() => Promise.resolve('test-token'));
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await apiFetch('/collections');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('omits Authorization header when token provider returns null', async () => {
    setTokenProvider(() => Promise.resolve(null));
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await apiFetch('/collections');

    const [, options] = mockFetch.mock.calls[0];
    expect((options?.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('throws ApiError with status and body on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ code: 'not_found' }, 404));

    await expect(apiFetch('/collections/missing')).rejects.toMatchObject({
      status: 404,
      body: { code: 'not_found' },
    });
  });

  it('throws ApiError even when error body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as Response);

    await expect(apiFetch('/boom')).rejects.toBeInstanceOf(ApiError);
  });
});
