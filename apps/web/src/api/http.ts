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

export async function readValidationMessage(response: Response): Promise<string | null> {
  const details = (await response.json().catch(() => null)) as
    | { errors?: Record<string, string[]> }
    | null;

  if (!details?.errors) {
    return null;
  }

  return Object.values(details.errors).flat()[0] ?? null;
}
