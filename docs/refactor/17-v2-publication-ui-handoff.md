# V2 Slice 6: Owner Review and Visitor Experience

Status (2026-10-04): owner review, explicit publication controls, and visitor HTML/media routes implemented. Publishing remains disabled by default. Slice 6 stays in progress until social metadata/card and deployment acceptance are complete.

## Delivered

- **Review for sharing** opens `/collections/{collectionId}/showcase/review` from the live private showcase. Opening either page does not prepare or publish anything. The owner explicitly prepares a review and sees the exact candidate DTO, its address, expiry, notices, image fallback, visible sections, and report scope.
- A suggested ASCII slug is editable before first publication. Names without enough ASCII use an independent random suffix. Invalid addresses are explained inline. Once claimed, the API's reserved address is read-only through unpublish and republish.
- Publication requires an acknowledgement and a separate publish action. Updates prepare a new snapshot; ordinary catalog/settings changes leave the current edition frozen. Unpublish has an explicit confirmation and preserves the reserved address.
- Status covers unpublished, published, and source-removal suspension. Conflicts and expired/stale reviews require a new review. Temporary failures permit retry without silently choosing another slug or edition. Image preparation failure offers an explicit prepare-without-images choice. Lost-response errors avoid claiming an action definitely failed; owners can retry or reload status.
- Owner BFF routes validate session, same-origin writes, UUID route segments, bounded input/output, and strict response schemas. They forward only the server bearer token to the configured API and map errors without private diagnostics. Candidate media remains authenticated, JPEG-only, bounded to 1 MiB, and private/no-store.
- `/showcase/{slug}` and `/showcase/{slug}/media/{revision}/{asset}` check the active publication on every GET/HEAD. Missing, retired, unpublished, and suspended editions return generic 404; upstream failure returns generic 503. Success and error responses use no-store/nosniff and do not forward cookies, authorization, storage redirects, or upstream response headers.
- Public routes bypass Auth0 before checking its configuration, including for a visitor with an expired signed-in session. The document contains no workspace navigation, owner identity, private API requests, hydration payload, or item-detail links. Images use the checked public media route, including for signed-in owners.
- Gallery and Journal share a pure presentation component with the owner candidate review: theme covers, vocabulary, selected cards, visibly shortened descriptions, optional summary and frozen growth/type reports. Hidden sections stay absent. Empty editions remain visitor-only presentations.

## Rendering and packaging

The visitor document is produced by an App Router route handler using React's static renderer at request time. It is not a build-time static export or cached page. One validated public DTO supplies the complete document. This preserves explicit HTTP 404/503 before any bytes are sent, including HEAD, and avoids an authenticated layout or a streaming error with a success status.

This replaces the design's proposed `page`/`generateMetadata` implementation detail. The next metadata task should construct the head from this same checked DTO, rather than introduce another fetch or shared cache. Current head values are generic with `noindex, nofollow`; collection-specific Open Graph metadata and social cards are deliberately still pending.

The public document needs no JavaScript. Its CSP allows only its same-origin stylesheet and images. The stylesheet is shared with the owner review and included in both the standalone start helper and Docker runtime. Public links from the owner use full document navigation.

## Validation

- Production V2 build and TypeScript checks passed.
- All 121 V2 unit/component tests passed (13 files). The final local run used two workers to avoid contention on the development computer.
- All 62 production-browser cases passed in Edge across desktop and mobile, including 10 new publication cases and the existing authentication, catalog, settings, Insights, and private showcase regressions.
- Gallery/Journal and owner review screenshots were inspected; desktop/mobile checks found no horizontal overflow. The standalone server serves the shared public stylesheet. Docker packaging includes it; a new Docker image was not built in this task.

Focused unit and browser acceptance cover session/origin boundaries, malformed paths and inputs, allowlist rejection, response bounds, sanitized errors, candidate mismatch, slug suggestions, expiry, plain-text rendering, image fallback, publication/update/unpublish/republish, frozen editions, source suspension, retired media denial, GET/HEAD headers, expired-session visitors, omitted sections, and empty collections.

Browser acceptance uses an isolated fixture API and actual production Next server with the Auth0 SDK's test sessions. It publishes only fixture records. Real PostgreSQL concurrency, image processing, and private MinIO behavior remain covered by the preceding [publication API acceptance](16-v2-publication-api-handoff.md); this task does not claim a deployed-edge or live Auth0 publication run.

## Rollout and next task

`Publication:Enabled` remains false in the normal API configuration. Until enabled, owner sharing controls report unavailability and public routes reveal no editions. Enabling an API requires `Storage:EnforcePrivateReadPolicy=true`; do not bypass the private-storage prerequisite. No user collections were published and no remote settings were changed by this task.

Next add the checked 1,200 × 630 social card, authorized candidate card preview, configured canonical origin, and public DTO-derived metadata. Verify initial bot HTML, long/Unicode/RTL text, every resource after replacement/revocation, private storage, trusted proxy rate-limit behavior, and no-store at the deployed edge before enabling remote publishing. Keep Slice 6 in progress until that acceptance passes.
