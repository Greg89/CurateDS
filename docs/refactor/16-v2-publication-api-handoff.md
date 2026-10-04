# V2 Slice 6: Publication Domain and API Handoff

Status (2026-10-04): publication backend implemented. Publishing is disabled by default; the owner review/publish UI, visitor pages, and social metadata are the next tasks. Slice 6 remains in progress.

## Delivered

- Separate publication heads, immutable review payloads, staged image records, and retained slug reservations. Migration `20261004102605_AddShowcasePublications` adds three tables without publishing or changing existing collections.
- Owner API supports status, preparing/reading a 30-minute review, reading its staged images, explicit activation with an expected generation, and unpublishing. There are at most five unexpired pending reviews per collection. Invalid or expired reviews return 409 on publish; foreign or unavailable owner resources return 404.
- Slugs are explicit lowercase ASCII, 3–80 characters, with single separating hyphens. A unique database constraint claims them on first publish. Once claimed, they survive rename, unpublish, and collection deletion. Exact retries succeed only while the consumed edition is still active.
- Snapshots use a consistent database view. They include at most six ordered highlights and six recent cards, optional summary counts, twelve UTC growth intervals, and six type groups with the total group count. Hidden sections are omitted. Descriptions are visibly marked when truncated to 1,000 characters, and the complete JSON is capped at 64 KiB. The snapshot's `asOfUtc` stays fixed; activation adds the actual `publishedUtc` timestamp.
- Public JSON is constructed from a dedicated allowlist. It excludes owner/source IDs, quantities, locations, tags, custom fields, audit actors, filenames, storage keys, external covers, and workspace links. Public item, revision, and image tokens are fresh opaque identifiers. Both generated OpenAPI/TypeScript and a strict V2 runtime schema describe this boundary; no public UI or BFF route is exposed yet.
- Public API reads at `/showcases/{slug}`, `/showcases/{slug}/revisions/{revision}`, and `/showcases/{slug}/media/{revision}/{asset}` require a live collection and exact active edition. GET/HEAD responses, including errors, use no-store and nosniff; there are no storage redirects, conditional 304 responses, or account cookies. Bearer handling returns no result for this route family before identity discovery or token validation. Owner endpoints retain authentication.
- Publish, unpublish, source removal, and cleanup serialize on the collection row. Generation checks prevent delayed publication from undoing revocation. Collection/item/media deletion suspends the publication in the same unit of work as the deletion. Type deletion conservatively suspends editions/reviews with a type report, including reports where groups were truncated. Ordinary edits leave the reviewed edition frozen.

## Images and cleanup

Primary originals are resolved through owned records, read with the existing 20 MiB bound, decoded only as approved raster formats, and checked against a 20-million-pixel limit before pixel allocation. Fresh JPEG derivatives apply camera orientation, remove source metadata/animation, use a white background for transparency, cap the longest edge at 1,600 pixels, and remain at most 1 MiB. Image work is limited to two concurrent preparations per API process, with a two-minute preparation deadline. Images are processed outside the snapshot transaction and source generation is checked again before the review becomes ready.

Derivatives use a separate private `showcases/{revision}/{asset}` namespace. Durable database records are saved before object writes, so interrupted preparation leaves cleanup work rather than an untracked object. A missing/invalid image fails review preparation with a retry/prepare-without-images choice; `omitImages: true` explicitly produces a review without images. Failed activation preserves the previous edition. External collection covers are never fetched; the review notices explain the theme fallback and report scope.

The bounded cleanup worker runs every two minutes while publishing is enabled, processes at most ten expired inactive editions per pass, and retains failed deletions for retry. A one-hour grace period after review expiry exceeds the preparation deadline. Active editions and permanent slug reservations are never removed. Revocation depends on publication state, not cleanup success.

Image processing uses [SkiaSharp 4.153.1](https://www.nuget.org/packages/SkiaSharp/4.153.1) and its Linux native package. The API Docker publish targets the container's runtime so unrelated native binaries are not shipped.

## Validation

- Final .NET run: 380 passed (67 domain, 120 application, 150 API, 43 infrastructure), with the opt-in MinIO test skipped in that run and passed separately. The three PostgreSQL-only race cases were exercised in the separate PostgreSQL run below.
- Domain/API tests cover slug validation, frozen editions, exact retries, replacement, stale/forged/expired reviews, ownership, omitted sections, source deletion, disabled-by-default behavior, and public reads while identity discovery is unavailable.
- PostgreSQL 17: all 43 infrastructure tests passed, including migration from the prior schema, competing slug claims with one winner, delayed publish behind unpublish and actual item deletion, bounded reports/cards, missing staged images preserving an active edition, source deletion during staging, and retryable cleanup. SQLite and decoder tests also passed.
- Real MinIO acceptance passed in an isolated bucket: catalog upload/read/delete, private staged and active derivatives, authorized review reads, anonymous checked public image decoding, direct storage denial, and JSON/image revocation after media deletion. Test objects and the temporary bucket were cleaned up.
- Native derivative decoding, resize, JPEG encoding, and decode passed inside the Linux API image. Camera orientation, invalid content, excessive dimensions, metadata removal, and byte/dimension limits have focused tests.
- V2: 94 tests passed. Generated contracts include owner and public publication operations; the production build passed and checks their compatibility with the strict runtime schema.

## Deployment and next task

The local Docker API is rebuilt and healthy with the additive migration applied, preserving the existing catalog and media volumes. V2 runs on localhost:3001. No collections were published during rollout.

`Publication:Enabled` defaults to false. Enabling it also requires `Storage:EnforcePrivateReadPolicy=true`; the API refuses the inconsistent configuration. This task does not enable remote publishing or change remote storage policy. Existing catalog workflows remain available. Before enabling a deployed service, finish the review UI/visitor experience and verify the private storage, no-store edge behavior, canonical origin, and metadata acceptance in the [sharing contract](../16-v2-showcase-sharing-contract.md).

Rate limits are configurable under `Publication`: five preparations per minute per owner and 120 anonymous reads per minute per remote IP by default, with no queue. Verify trusted proxy/IP handling and tune these limits during deployment acceptance. The publication API does not add a generic image fetcher or expose arbitrary storage keys.

Next implement the separate owner review, publish/update/unpublish controls and recovery, plus visitor routes using the exact public DTO. Slug suggestions belong in that review UI; the API never silently changes a requested slug. Then add the checked social card and bot/edge acceptance. Do not mark Slice 6 complete before those steps pass.
