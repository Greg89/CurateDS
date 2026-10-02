# CurateDS V2 web foundation

This temporary Next.js App Router workspace implements V2 Slice 1. The existing Vite app remains in `apps/web`. Collection creation, item browsing/editing, insight data, and showcase workflows are later slices; their destinations are deliberately not active yet.

## Run locally

Use Node 24.15 or newer in the Node 24 release line (matching CI and the Docker image). The older Node 22.14 installation on this workstation is below the current test dependencies' requirements.

From the repository root:

```powershell
npm ci --ignore-scripts
npm run setup:local --workspace @curateds/web-v2
npm run dev:web-v2
```

The setup command creates the ignored `.env.local` only if it does not exist, generates a new cookie-encryption secret, and copies the tenant domain and API audience from the root `.env` when available. It never copies the existing SPA client ID or prints credentials. Fill in the Regular Web Application client ID and secret before testing live sign-in. Rerunning setup leaves the existing file unchanged.

Open http://localhost:3001. Without Auth0 configuration the public page displays a sign-in availability message; protected pages redirect home and API requests fail closed.

## Auth0 configuration

Use an Auth0 **Regular Web Application**, not the current Vite SPA application. Set these server-only values in `apps/web-v2/.env.local`:

| Variable | Purpose |
| --- | --- |
| `APP_BASE_URL` | `http://localhost:3001` locally; exact HTTPS origin when deployed |
| `AUTH0_DOMAIN` | Your Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Regular Web Application client ID |
| `AUTH0_CLIENT_SECRET` | Its client secret |
| `AUTH0_SECRET` | A random 32-byte hexadecimal cookie-encryption secret |
| `AUTH0_AUDIENCE` | The same API identifier configured as the .NET API audience |
| `API_BASE_URL` | .NET API origin, e.g. `http://localhost:8080`; server-side only |

Generate the cookie secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Do not commit it.

Register `http://localhost:3001/auth/callback` as an allowed callback URL and `http://localhost:3001` as an allowed logout URL. Register the corresponding deployed URLs before testing a hosted app. The SDK requests `openid profile email offline_access`; enable the refresh-token grant and API offline access if persistent sessions should renew API tokens.

Next.js owns the encrypted HTTP-only session cookie. The SDK proxy handles login, callback, logout, and rolling sessions. Protected layouts check the session independently; the collection API route also checks it independently. API tokens are obtained in the route handler, where refreshed session cookies can be saved. The SDK's browser access-token endpoint is disabled.

There is no development sign-in bypass. Browser tests use the SDK's documented `generateSessionCookie` helper with an isolated test secret and a local fixture API. Those tests validate the app's session boundary; they do not replace a live Auth0 login/callback/logout smoke test.

Auth0 setup reference: [Next.js SDK documentation](https://github.com/auth0/nextjs-auth0).

## Routes and data boundary

- `/`: public welcome page and sign-in.
- `/collections`: account-owned collection list, including loading, retry, and empty states.
- `/collections/[collectionId]`: collection shell and foundation overview. The URL selects context; the provider does not persist a competing active collection.
- `/api/collections`: authenticated, read-only web boundary for the .NET collection list.

The web route forwards the bearer token only to the configured API, refuses upstream redirects, validates JSON with Zod, and returns private/no-store responses. Raw API errors and tokens never appear in its response. The .NET API remains authoritative for collection ownership and domain rules. TanStack Query handles browser server state; it is scoped to the protected app's provider, and sign-out uses a full document navigation.

## API contract generation

The checked-in contract snapshot contains only the collection-list operation and its referenced schemas. It was extracted from the running .NET OpenAPI document, not authored as a parallel schema. `CollectionCrudEndpoints` explicitly advertises its existing response type, and an API integration test verifies it.

Regenerate from a running API in Development:

```powershell
npm run contracts --workspace @curateds/web-v2 -- http://localhost:8080/openapi/v1.json
```

Regenerate types offline from the checked-in snapshot:

```powershell
npm run contracts --workspace @curateds/web-v2
```

Runtime schemas are typed against the generated response contract. Regenerate and review both snapshot and schema changes whenever the API response changes.

## Validation

```powershell
npm run build:web-v2
npm run test:web-v2
npx playwright install chromium
npm run test:e2e --workspace @curateds/web-v2
```

Browser tests start isolated servers on loopback ports 3101 and 3102 and exercise the production standalone build. They cover unauthenticated denial, SDK test-session access, URL-driven switching/history, empty/missing collections, and API failure recovery on desktop and mobile. Session checks also cover consecutive refresh-token rotations, persistence of refreshed credentials across requests, missing/rejected refresh tokens, and logout revocation, cookie deletion, and protected-route denial. Build first. To use installed Edge on Windows, set `$env:PLAYWRIGHT_CHANNEL='msedge'`.

The Playwright server command preloads `e2e/auth-transport.mjs` to route only the reserved `https://test.invalid` issuer to the local fixture. The production SDK and collection route execute normally; the fixture supplies discovery and token responses. This preload is not used by normal development, start, or Docker commands. These checks do not prove the live tenant's refresh grants or logout URL configuration.

The existing web build/tests remain part of root `npm run verify`; the V2 build and unit tests are also included. CI additionally runs the focused browser suite.

## Deployment preparation

Build from the repository root:

```powershell
docker build -f apps/web-v2/Dockerfile -t curateds-web-v2 .
```

The image runs the standalone Next.js server as the non-root Node user. Set the Auth0 and API variables at runtime; do not use `NEXT_PUBLIC_` for credentials or the API bearer token. The server binds to `0.0.0.0` and uses `PORT` (default 3000). The separate `apps/web-v2/railway.toml` is intended for a new Railway service rooted at this repository. Select that config file for that service. The existing application's deployment files are not switched to V2.

For a local production preview after building, run `npm run start --workspace @curateds/web-v2`. The helper copies static assets into the standalone output and starts it on loopback port 3001.

Deployment and live Auth0 tenant configuration are not performed by this slice.
