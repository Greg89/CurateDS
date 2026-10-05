# V2 Slice 6: Social Previews and Rollout Preparation

Status (2026-10-04): social cards, authorized candidate previews, and canonical/Open Graph/Twitter metadata are implemented. The user confirmed there is no deployed V2 environment yet. Publishing remains disabled by default; Slice 6 remains in progress pending deployed acceptance.

## Delivered

- The visitor document builds its title, bounded description, canonical URL, and social metadata from the same validated immutable DTO as its body. Metadata is present in initial HTML for browsers and bots. `APP_BASE_URL` is the sole origin authority; it must be HTTPS except for local loopback development. Invalid configuration returns a generic 503. Error pages omit collection metadata.
- `/showcase/{slug}/social/{revision}` checks the exact active edition on every GET/HEAD before rendering a 1,200 × 630 PNG. Replaced, revoked, suspended, and malformed revisions return generic 404; upstream or rendering failure returns generic 503. Responses use no-store/nosniff, with no session or token refresh even for signed-in visitors. There is no card cache or image-optimizer route.
- The owner review loads its card through `/api/collections/{id}/publication/previews/{token}/social`. Existing session, ownership, candidate-expiry, and strict DTO checks apply. The owner must see the card load before acknowledging and publishing; a failed card has a retry action. Candidate and active cards use the same renderer. Private preview URLs cannot read the consumed candidate after publication.
- Cards show title, category, theme, and CurateDS branding. They do not fetch photographs, include reports, or expose owner identity. Long text is wrapped and visibly shortened. The preview explains symbol fallback and shortening before publication; the showcase retains its original text.

## Text rendering and packaging

Noto font files and OFL notices are shipped under `apps/web-v2/assets/fonts`. Latin/Greek/Cyrillic, Arabic, Hebrew, and CJK text use local font shaping with `fontkit` and bidirectional ordering with `bidi-js`. Unsupported glyphs, including unsupported emoji, receive a visible replacement mark. The CJK font uses Simplified Chinese regional glyph forms; this is not a promise of support for every writing system. Font sources and checksums are recorded in that directory's README.

Text is converted to glyph-path SVGs before passing it to Next's `ImageResponse`, with its font list empty. This avoids sending candidate text to an external font or emoji service and handles joined Arabic without relying on Satori's incomplete bidirectional support. Only shipped fonts are cached; candidate DTOs and generated cards are never cached. Two renders per process may run concurrently, and PNG reads are bounded to 4 MiB before acknowledging success.

`fontkit` and `next/og` load as server external packages. The production standalone renderer stalled while Next bundled `next/og`; direct Node loading resolves that stream failure. Production browser tests exercise this packaging choice. Font assets are explicitly included in tracing, the standalone start helper, and the Docker runtime. The fonts add approximately 17 MB of server assets and are not downloaded by visitors.

## Validation

- Production V2 build and TypeScript checks passed.
- All 145 V2 unit/component tests passed across 15 files.
- All 66 production-browser cases passed in Edge across desktop and mobile, including the four new social-sharing cases.
- Generated card variants were visually inspected, including mixed Arabic/Hebrew text. Owner card screenshots and overflow assertions passed on desktop and mobile in a final focused rerun. Standalone font and Next image-renderer dependencies are present. Docker packaging includes the font assets; a new Docker image was not built in this task.

Focused production acceptance verifies owner authorization and retry, exact candidate/published PNG equality, initial browser/bot metadata, configured origin despite forwarded-header spoofing, no public session refresh, replaced/revoked card denial, and generic outage handling.

Local rendering checks cover long, empty, mixed Unicode, joined Arabic, Hebrew, and unsupported-symbol text without external HTTP requests. The read-only rollout checker is exercised against active and revoked fixture editions, including every derivative through web and API routes. Fixture tests publish only isolated test records; no user collections or remote settings are changed.

## Next task

Use the [publication rollout checklist](19-v2-publication-rollout-checklist.md) when a V2 deployment is available. It includes a read-only GET/HEAD/conditional edge checker, real private-storage verification, trusted proxy/rate-limit review, Auth0 acceptance, and active/replaced/revoked resource checks. The API currently partitions anonymous reads by its observed remote address, so V2 requests share the web server's API rate bucket; the deployed topology and limits must be assessed explicitly.

Keep `Publication:Enabled=false` until the documented acceptance and rollout are authorized and complete. A passing local suite does not establish deployed no-store behavior, private bucket policy, or per-client edge throttling. This task prepares those checks and does not mark Slice 6 complete.
