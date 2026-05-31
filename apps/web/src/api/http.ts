import { appConfig } from "../config";

// ---------------------------------------------------------------------------
// Auth token provider
// ---------------------------------------------------------------------------

type TokenProvider = () => Promise<string>;
let _tokenProvider: TokenProvider | null = null;

/** Call this once (inside Auth0Provider context) to enable bearer tokens on all requests. */
export function setTokenProvider(fn: TokenProvider): void {
  _tokenProvider = fn;
}

export async function authHeader(): Promise<Record<string, string>> {
  if (!_tokenProvider) return {};
  const token = await _tokenProvider();
  return { Authorization: `Bearer ${token}` };
}

export const apiBase = appConfig.apiBaseUrl;

export interface ApiProblemDetails {
  /** Human-readable message (first field error if a validation problem, otherwise `detail`). */
  message: string | null;
  /** Machine-readable code from the `code` extension, if the API supplied one. */
  code: string | null;
  /** Field-level validation errors, when present. */
  errors: Record<string, string[]> | null;
}

interface RawProblemDetails {
  errors?: Record<string, string[]>;
  detail?: string;
  code?: string;
}

/**
 * Parses an RFC 7807 problem response into a normalized shape.
 * Reads the response body exactly once. Safe to call on any non-2xx response.
 * Returns `null` if the body is not parseable as JSON.
 */
export async function readProblemDetails(response: Response): Promise<ApiProblemDetails | null> {
  const details = (await response.json().catch(() => null)) as RawProblemDetails | null;

  if (!details) return null;

  const message = details.errors
    ? Object.values(details.errors).flat()[0] ?? null
    : details.detail ?? null;

  return {
    message,
    code: typeof details.code === "string" && details.code.length > 0 ? details.code : null,
    errors: details.errors ?? null,
  };
}

/**
 * Backwards-compatible helper that returns just the message.
 * Prefer `readProblemDetails` for new code that needs the machine-readable `code`.
 */
export async function readValidationMessage(response: Response): Promise<string | null> {
  const problem = await readProblemDetails(response);
  return problem?.message ?? null;
}
