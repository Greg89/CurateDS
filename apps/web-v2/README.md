# CurateDS V2 web foundation

This temporary Next.js App Router workspace implements V2 Slices 1–5. The existing Vite app remains in `apps/web`. Users can create collections, browse and edit items with custom fields and images, explore insights, and save filtered views. Settings supports collection identity, ordered pins, optional overview sections, collection vocabulary, and custom-field definitions. Slice 6 includes private showcases and reviewed public editions with checked media, social cards, and metadata. Publishing remains disabled by default pending deployed acceptance.

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

| Variable              | Purpose                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `APP_BASE_URL`        | `http://localhost:3001` locally; exact HTTPS origin when deployed; also supplies canonical/social URLs |
| `AUTH0_DOMAIN`        | Your Auth0 tenant domain                                          |
| `AUTH0_CLIENT_ID`     | Regular Web Application client ID                                 |
| `AUTH0_CLIENT_SECRET` | Its client secret                                                 |
| `AUTH0_SECRET`        | A random 32-byte hexadecimal cookie-encryption secret             |
| `AUTH0_AUDIENCE`      | The same API identifier configured as the .NET API audience       |
| `API_BASE_URL`        | .NET API origin, e.g. `http://localhost:8080`; server-side only   |

Generate the cookie secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Do not commit it.

Register `http://localhost:3001/auth/callback` as an allowed callback URL and `http://localhost:3001` as an allowed logout URL. Register the corresponding deployed URLs before testing a hosted app. The SDK requests `openid profile email offline_access`; enable the refresh-token grant and API offline access if persistent sessions should renew API tokens.

If live acceptance reports no refresh token, check both Auth0 Dashboard settings and save: **Applications → APIs → the API matching `AUTH0_AUDIENCE` → Settings → Allow Offline Access**, and **Applications → Applications → the application matching `AUTH0_CLIENT_ID` → Settings → Advanced Settings → Grant Types → Refresh Token**. Then rerun the checker and sign in afresh. See [Auth0's Next.js token-refresh guidance](https://support.auth0.com/center/s/article/Token-Refresh).

Next.js owns the encrypted HTTP-only session cookie. The SDK proxy handles login, callback, logout, and rolling sessions. Protected layouts check the session independently; the collection API route also checks it independently. API tokens are obtained in the route handler, where refreshed session cookies can be saved. The SDK's browser access-token endpoint is disabled.

There is no development sign-in bypass. Browser tests use the SDK's documented `generateSessionCookie` helper with an isolated test secret and a local fixture API. Those tests validate the app's session boundary; they do not replace a live Auth0 login/callback/logout smoke test.

Auth0 setup reference: [Next.js SDK documentation](https://github.com/auth0/nextjs-auth0).

### Interactive live acceptance

With the configured app running on `http://localhost:3001`, run:

```powershell
npm run test:auth:live --workspace @curateds/web-v2
```

The checker opens a separate browser context (installed Edge on Windows). Sign in normally, then sign in once more when prompted after the logout check. It verifies the actual tenant and API: login/callback, two consecutive token renewals with persisted session cookies, logout return, protected-page/API denial, and sign-in after logout. It signs out the final test session and closes the window when finished. Each sign-in has a five-minute timeout.

To trigger renewal immediately, the checker uses the local cookie secret and SDK helpers to change only the access-token expiry timestamp in its own authenticated test session. It preserves the real identity and credentials; it does not mint an identity or alter tenant settings. Cookies and credentials stay in memory; no traces, screenshots, or browser-state files are saved. Run `npm run test:auth:live --workspace @curateds/web-v2 -- --check` to check local configuration and app availability without opening the browser. This command is local-only and is not part of CI.

## Routes and data boundary

- `/`: public welcome page and sign-in.
- `/collections`: account-owned collection list, including loading, retry, and empty states.
- `/collections/new`: collection creation with progressive identity options and recoverable save errors.
- `/collections/[collectionId]`: collection identity, live summary cards, six most recent items, and links into the full item editor. The URL selects context; the provider does not persist a competing active collection.
- `/collections/[collectionId]/browse`: URL-driven search, filters, sorting, pagination, and grid/list views.
- `/collections/[collectionId]/items/new`, `/items/[itemId]`, and `/items/[itemId]/edit`: full creation, detail, editing, and image management within the collection.
- `/collections/[collectionId]/showcase`: authenticated private gallery preview using saved identity, vocabulary, pins, and overview visibility choices.
- `/collections/[collectionId]/insights`: collection cards, twelve-month growth, location/tag/type/custom-field breakdowns, paged activity, and saved views.
- `/api/collections/[collectionId]/insights`, `/activity`, and `/saved-views`: validated session boundaries; saved-view creation/removal require same-origin writes.
- `/collections/[collectionId]/settings`: edit collection identity, cover URL, and colour with preview, discard, and recoverable saves; select/reorder up to six pinned items and choose which overview sections appear; customize singular/plural labels and field definitions.
- `/api/collections/[collectionId]`: authenticated, same-origin collection identity update (PUT).
- `/api/collections/[collectionId]/vocabulary`: independent singular/plural label update (PUT).
- `/api/collections/[collectionId]/fields` and `/fields/[fieldId]`: custom-field creation, update, and confirmed removal (POST/PUT/DELETE), using the existing API attribute-definition services.
- `/api/collections/[collectionId]/presentation`: owner-scoped overview preferences and ordered pinned items (GET/PUT).
- `/api/collections`: authenticated collection list and creation boundary.
- `/api/collections/[collectionId]/summary`: authenticated overview counts.
- `/api/collections/[collectionId]/items`: recent items or validated browse queries (GET), and full item creation (POST). Item detail/update/delete and media operations use explicitly allowlisted nested routes; option routes provide types, definitions, tags, and locations.

The web route forwards the bearer token only to the configured API, refuses upstream redirects, validates JSON with Zod, and returns private/no-store responses. Writes require an Origin matching `APP_BASE_URL`, a server session, and validated input; user-supplied ownership fields are discarded. Raw API errors and tokens never appear in its response. The .NET API remains authoritative for collection ownership and domain rules. TanStack Query handles browser server state; it is scoped to the protected app's provider, and sign-out uses a full document navigation.

Apply the additive `AddCollectionIdentity` migration by starting the updated API before using the new form. Existing collections retain their names/data and use the default identity until customized in Settings. Collection covers use external HTTPS links. The item editor handles global/type-specific required fields, tags, locations, quantity, and descriptions. Images are uploaded from the detail page: JPG/PNG/WebP/GIF, 20 MiB maximum. Uploaded media is read through the authenticated `/api/collections/{collectionId}/items/{itemId}/media/{mediaAssetId}/content` boundary. API responses contain scoped relative paths, not bucket URLs. Reads are bounded to 20 MiB, raster content types only, and use private/no-store plus nosniff headers. The session boundary bounds streamed request bytes, including when Content-Length is missing, and forwards only one validated file. Upload, primary selection, removal, and item deletion invalidate collection-scoped queries. API validation remains authoritative.

For local uploads, start the optional [development storage override](../../tools/local-storage/README.md). It keeps files in Docker on this computer. Remote deployments still require their own Storage settings; no remote bucket or privacy policy was changed.

## Overview customization

In Settings, **Shape your overview** toggles the cover/story, summary counts, pinned items, and recent items. Choose up to six pins with the searchable, paged item finder; move them earlier/later to set their display order. Save overview separately from identity changes. Hiding the pinned section keeps the selection, and deleted items disappear automatically.

Start the updated API to apply the additive `AddCollectionPresentation` migration. Existing collections default to all sections enabled and no pins. Pinned item references are checked against active collection items on both reads and writes. The overview keeps its add/browse/settings links even with every optional section hidden. The private showcase preview uses these same choices. Opening it never publishes the collection.

## Collection words and custom fields

In Settings, **What do you collect?** saves singular/plural labels (for example, book/books) independently of identity and overview preferences. Labels can be reset to item/items. Start the updated API to apply `AddCollectionVocabulary`; existing collections keep the defaults.

**Choose your custom fields** creates or edits the details an item can carry. Choose text, whole number, decimal, yes/no, or date, and set required/filterable behavior and optional scope to an existing item type. The kind of detail stays fixed after creation. Required values are enforced on the next applicable item save. Changes refresh collection-scoped editor and insight data.

Removing a field requires confirmation because it permanently deletes its saved values. Renaming keeps values but changes the field's filter key under existing API behavior; recreate saved views using that field. Item-type creation, account-wide tags/locations, and predefined choice lists are outside this workflow. Existing SingleSelect fields remain editable as text choices.

## Insights and saved views

Insights aggregate currently kept items; the twelve-month chart uses UTC creation dates and excludes deleted items. Collection category stays in the header, while item types provide the within-collection grouping. Custom-field breakdowns show up to twenty most common values and use exact typed-value filters when opening Browse. Month links use an inclusive start and exclusive end. Activity includes deleted-item history; those items may no longer open.

Browse preserves these report filters when ordinary filters are applied. Named saved views retain filters and sorting and restore page one, leaving grid/list presentation at its default. Supported legacy saved filters also restore in V2. Unsupported filter JSON is reported explicitly; the legacy client hides V2-only saved views so it cannot silently broaden a result.

## Private showcase preview

Open **Showcase** from collection navigation to view the first gallery presentation. A compact toolbar keeps collection switching, return, and customization available. Identity/cover, ordered pinned highlights, summary counts, and recent additions come from the existing authenticated API data. Visible highlights are omitted from recent additions to avoid duplicate cards. Missing images have a fallback, and empty collections remain navigable.

The route inherits the workspace's server session check, requires collection ownership through existing API calls, and uses generic `noindex, nofollow` metadata. Gallery/Journal layouts and selected growth/type reports are saved separately from overview section preferences. This live preview stays private even when a separate edition is published.

## Reviewed public editions

Choose **Review for sharing** from the private showcase, edit the proposed address, and explicitly **Prepare review**. Check the exact snapshot, sharing notices, and loaded social card, then acknowledge and publish it. A failed card offers a retry and keeps publication disabled until it loads. The same flow prepares updates. Unpublish requires confirmation; its address stays reserved. Image failures offer a prepare-without-images choice, and expired/conflicting reviews require preparation again.

The owner flow is `/collections/[collectionId]/showcase/review`, backed by authenticated, same-origin `/api/collections/[collectionId]/publication` routes. Visitors use `/showcase/[slug]` and checked `/showcase/[slug]/media/[revision]/[asset]` images. These routes bypass Auth0, contain no workspace navigation or private fields, and return no-store HTML/JPEG with generic 404/503 responses. The visitor document renders from one validated immutable DTO with no client JavaScript. It shares its presentation component and stylesheet with the owner review.

The API's `Publication:Enabled` setting remains **false by default**, so sharing controls report unavailability until it is enabled. Enabling requires `Storage:EnforcePrivateReadPolicy=true`. This task does not enable local or remote publication or publish user collections. Social cards and canonical/bot metadata are implemented. Keep remote publishing disabled until deployed-edge/private-storage acceptance is complete. No deployed V2 environment exists yet. See the [social preview handoff](../../docs/refactor/18-v2-social-preview-handoff.md) and [prepared rollout checklist](../../docs/refactor/19-v2-publication-rollout-checklist.md). Browser tests exercise enabled publication in an isolated fixture only.

Public metadata comes from the exact reviewed DTO and configured `APP_BASE_URL`, never forwarded Host headers. `/showcase/[slug]/social/[revision]` serves a checked, uncached 1,200 × 630 PNG. The owner candidate card uses the authenticated preview route. Local fonts cover Latin/Greek/Cyrillic, Arabic, Hebrew, and CJK; long text shortens visibly and unsupported symbols use replacement marks. No candidate text is sent to an external font or emoji service. Two card renders may run concurrently per web process.

The read-only `scripts/check-showcase-edge.mjs` checks active/revoked page, JSON, card, and all derivative GET/HEAD/conditional responses through supplied web/API origins. Use the rollout checklist for exact commands and the separate private-storage and proxy/rate-limit checks it cannot prove.

## API contract generation

The checked-in contract snapshot contains collection creation/update/vocabulary/summary/presentation, custom-field writes, Insights/activity/saved-view, item CRUD, option-listing, and media operations with their referenced schemas. It was extracted from the running .NET OpenAPI document, not authored as a parallel schema. These endpoints explicitly advertise their response types.

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

The browser suite also covers pin selection/search/pagination/order/limit/removal, section visibility, failed saves, deleted pins, collection identity editing, validation focus, draft recovery, discard, clearing fields, persistence, and switching Settings context, plus Insights drill-through, activity pagination, saved-view creation/restoration/removal and save-error recovery, URL filter restoration, sorting/pagination, grid/list switching, required custom fields, item editing, image upload/primary/removal, item deletion, collection isolation, and first-run creation, preservation of a draft after a failed save, first-item creation, reload persistence, and collection-specific counts/recent items after switching. The existing web build/tests remain part of root `npm run verify`; the V2 build and unit tests are also included. CI additionally runs the focused browser suite.

## Deployment preparation

Build from the repository root:

```powershell
docker build -f apps/web-v2/Dockerfile -t curateds-web-v2 .
```

The image runs the standalone Next.js server as the non-root Node user. Set the Auth0 and API variables at runtime; do not use `NEXT_PUBLIC_` for credentials or the API bearer token. The server binds to `0.0.0.0` and uses `PORT` (default 3000). The separate `apps/web-v2/railway.toml` is intended for a new Railway service rooted at this repository. Select that config file for that service. The existing application's deployment files are not switched to V2.

For a local production preview after building, run `npm run start --workspace @curateds/web-v2`. The helper copies static assets and shipped server fonts into the standalone output and starts it on loopback port 3001.

Deployment and live Auth0 tenant configuration are not performed by this slice.
