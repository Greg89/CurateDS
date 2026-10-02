# V2 Slice 1 Handoff

Status: implementation complete; live Auth0 configuration and deployment smoke testing remain external setup.

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
- Production standalone browser tests: 8 passed (desktop and mobile emulation in installed Edge), including encrypted SDK test sessions, the real web API boundary, switching/history, failure recovery, and empty/missing states. Desktop/mobile screenshots were visually reviewed and no viewport overflow was detected.
- Existing Vite web: build passed and all 136 tests passed. Its existing large-bundle warning remains.
- API integration suite: all 100 tests passed, including the new collection OpenAPI contract test.
- Docker build passed on Node 24 Alpine. Runtime smoke: landing page 200, stylesheet 200, unconfigured API 503, runtime UID 1000. The disposable smoke container was stopped/removed.
- `npm ci --ignore-scripts` succeeded in the Docker build; npm audit reported zero vulnerabilities after updating the existing undici override from 7.29.0 to 7.29.1.
- `git diff --check` passed. Live Auth0 and Railway deployment are not claimed as tested.

## Remaining setup before live acceptance

Configure a Regular Web Application in Auth0, set the server-only environment values, and register callback/logout URLs. Verify an actual login, API access, token refresh, logout, and return to the protected routes against the intended .NET API. The automated browser suite uses SDK-generated encrypted test sessions and a local API fixture; it does not contact a live tenant.

The current foundation intentionally leaves create/browse/insights/showcase/settings workflows for later slices. No sample collections are shipped to production, no auth bypass is added, and no deployment has been performed.

## Next scope

Finish live setup/smoke validation for Slice 1 before proceeding to [Slice 2](../15-v2-roadmap.md#slice-2-first-collection-and-overview). Keep the current web available as the behavioral reference.
