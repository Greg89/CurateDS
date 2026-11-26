# V2 Slice 1 Handoff

Status: complete; implementation and live Auth0 acceptance passed. Ready for Slice 2.

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
- Live Auth0 acceptance passed after the user updated the tenant configuration and ran `scripts/live-auth-smoke.ts` locally. The user-provided terminal results confirm login/callback and authenticated collection access, two consecutive token refreshes with successful API access and persisted session cookies, logout return/session removal/protected-route denial, and successful sign-in/API access after logout. The checker signed out the isolated test session on completion. This resolves the earlier missing-refresh-token issue. Railway deployment has not been tested.

## Live acceptance and reruns

No Slice 1 live acceptance checks remain. Preserve the working Auth0 configuration: the local callback registration includes `http://localhost:3001/auth/callback`, the logout registration includes `http://localhost:3001`, and refresh-token issuance requires the application's Refresh Token grant and the API's Allow Offline Access setting. The automated browser suite uses SDK-generated encrypted test sessions and a local API fixture; the separate interactive checker exercises the live tenant and intended .NET API.

Rerun `npm run test:auth:live --workspace @curateds/web-v2` when changing tenant or session configuration. It requires normal user sign-in in an isolated browser, expires only the SDK access-token timestamp in that real session, verifies two renewals and cookie persistence, and checks logout plus sign-in again. No credentials or browser state are written to disk. Its session read/expiry helpers also passed the fixture suite. See [the interactive instructions](../../apps/web-v2/README.md#interactive-live-acceptance).

The current foundation intentionally leaves create/browse/insights/showcase/settings workflows for later slices. No sample collections are shipped to production, no auth bypass is added, and no deployment has been performed.

## Next scope

Proceed to [Slice 2: First Collection And Overview](../15-v2-roadmap.md#slice-2-first-collection-and-overview). Keep the current web available as the behavioral reference.
