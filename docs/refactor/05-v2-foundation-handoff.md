# V2 Slice 1 Handoff

Status: implementation complete; live login, callback, collection-list access, and manual logout confirmed. Live token refresh and protected-route denial after logout remain to be verified.

Current live acceptance issue: the interactive checker passed login/callback and authenticated collection access, then stopped at the first refresh check because the actual session contained no refresh token. Confirm the application's Refresh Token grant and the API's Allow Offline Access setting, then rerun with a fresh sign-in. The app already requests `offline_access`.

The first refactor pass is complete. This continuation implements the accepted Slice 1 foundation in `apps/web-v2`; Slice 2 has not started.

## Delivered

- Next.js App Router workspace alongside the existing Vite web.
- Server-managed Auth0 session boundary, protected layouts, and authenticated collection API route.
- OpenAPI-generated collection types plus runtime validation; API ownership/domain rules remain authoritative.
- TanStack Query provider and URL-authoritative collection context, including switching and browser history.
- Responsive welcome, collection list, and collection shell, with loading, retry, empty, missing-collection, and session-expiry states.
- Base visual tokens and accessible native selection/focus behavior.
- Standalone build, Docker/Railway service configuration, root scripts, and CI checks.
- Setup and validation commands in [the workspace README](../../apps/web-v2/README.md).

## Validation (2026-10-02)

- V2 production build passed; generated collection types were regenerated from the checked-in API snapshot.
- V2 unit/component tests: 17 passed.
- Production standalone browser tests: 14 passed (desktop and mobile emulation in installed Edge), including encrypted SDK test sessions, the real web API boundary, switching/history, failure recovery, and empty/missing states. Desktop/mobile screenshots were visually reviewed and no viewport overflow was detected.
- Session lifecycle checks use the production SDK with an isolated identity-provider fixture: two consecutive refresh-token rotations persist across requests, a third request reuses the valid access token, missing/rejected refresh tokens return a safe 401 without calling the collection API, and logout revokes the refresh token, clears the cookie, and denies protected access. These checks do not establish live tenant configuration.
- Existing Vite web: build passed and all 136 tests passed. Its existing large-bundle warning remains.
- API integration suite: all 100 tests passed, including the new collection OpenAPI contract test.
- Docker build passed on Node 24 Alpine. Runtime smoke: landing page 200, stylesheet 200, unconfigured API 503, runtime UID 1000. The disposable smoke container was stopped/removed.
- `npm ci --ignore-scripts` succeeded in the Docker build; npm audit reported zero vulnerabilities after updating the existing undici override from 7.29.0 to 7.29.1.
- `git diff --check` passed.
- Live Auth0 smoke: the user reached `http://localhost:3001/collections` with a signed-in account and the successful empty-collection state after resolving the callback URL mismatch. This confirms login, callback/session establishment, and authenticated collection-list access. The user subsequently confirmed signing in and signing out locally. Token refresh and protected-route denial after logout have not been verified against the live tenant. Railway deployment has not been tested.

## Remaining checks before live acceptance

Verify denial of protected-route access after live logout and successful sign-in again. Separately verify token refresh against the intended .NET API; an initial successful login does not establish refresh behavior. Local callback registration must include `http://localhost:3001/auth/callback`, and logout registration must include `http://localhost:3001`. The automated browser suite uses SDK-generated encrypted test sessions and a local API fixture; it does not contact a live tenant.

The interactive `npm run test:auth:live --workspace @curateds/web-v2` checker now covers these remaining checks against the configured localhost app and live tenant. It requires normal user sign-in in an isolated browser, expires only the SDK access-token timestamp in that real session, verifies two renewals and cookie persistence, and checks logout plus sign-in again. No credentials or browser state are written to disk. Its session read/expiry helpers passed the fixture suite; a prepared checker alone does not establish live acceptance. See [the interactive instructions](../../apps/web-v2/README.md#interactive-live-acceptance).

The current foundation intentionally leaves create/browse/insights/showcase/settings workflows for later slices. No sample collections are shipped to production, no auth bypass is added, and no deployment has been performed.

## Next scope

Finish live setup/smoke validation for Slice 1 before proceeding to [Slice 2](../15-v2-roadmap.md#slice-2-first-collection-and-overview). Keep the current web available as the behavioral reference.
