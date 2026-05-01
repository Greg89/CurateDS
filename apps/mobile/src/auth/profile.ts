export type Auth0Profile = {
  sub: string;
  name?: string;
  email?: string;
};

/**
 * Decodes an Auth0-issued JWT id_token without verifying the signature.
 * The token's signature is verified at the API; on the client we only need
 * the claims to render the profile.
 */
export function decodeIdToken(idToken: string): Auth0Profile | null {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = decodeBase64Url(parts[1]);
    const claims = JSON.parse(payload) as Partial<Auth0Profile>;
    if (typeof claims.sub !== 'string') {
      return null;
    }
    return {
      sub: claims.sub,
      name: typeof claims.name === 'string' ? claims.name : undefined,
      email: typeof claims.email === 'string' ? claims.email : undefined,
    };
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  if (typeof atob === 'function') {
    return atob(padded);
  }
  // Node / Jest fallback.
  return Buffer.from(padded, 'base64').toString('utf-8');
}
