# V2 Slice 6: Private Catalog Media Handoff

Status (2026-10-04): implemented and validated locally. This completes the private-media prerequisite; Slice 6 remains in progress.

## Delivered

- Catalog media URLs now identify `/collections/{collectionId}/items/{itemId}/media/{assetId}/content`. Upload, detail, browse, and presentation responses use this path without exposing storage keys or direct object URLs. No database migration is required.
- The API verifies the collection owner and active collection/item/asset relationship before reading storage. Anonymous requests fail with 401; foreign, mismatched, missing, and deleted resources return 404. Reads accept the supported raster content types, enforce the recorded size and 20 MiB ceiling, and return private/no-store and nosniff headers, including failure responses.
- V2 serves images through its same-origin session route, keeps bearer tokens on the server, rejects redirects, bounds response bytes, and forwards only approved image headers. The legacy client's image adapter authenticates API fetches, rejects arbitrary URLs before obtaining a token, and releases temporary blob URLs when images change or unmount.
- Public bucket grants are disabled by default. Explicit `EnforcePrivateReadPolicy=true` removes the entire catalog bucket policy and fails startup if enforcement fails. It overrides the retained legacy public-read switch. The local storage override enables enforcement; merely setting `EnablePublicReadPolicy=false` still does not remove a pre-existing policy.
- Local API and legacy web images were rebuilt and applied with the storage override, preserving database and media volumes. Their Docker health probes were corrected: the API image installs curl, and both probes use IPv4 loopback. V2 runs on localhost:3001.

## Validation

- .NET: all 352 tests passed (57 domain, 120 application, 143 API, 32 infrastructure); the optional local-storage test was skipped in this run and passed separately below. Coverage includes owner/anonymous/foreign access, wrong item, deleted collection/item/media, missing storage objects, invalid metadata, length mismatch, storage failure, and startup enforcement failure. All 30 database/storage infrastructure tests also passed against disposable PostgreSQL 17; the two additional policy-startup tests do not use a database.
- The real local-MinIO acceptance test passed: it first exposed an isolated test object with the old public policy, removed that policy through API startup, proved the old URL was denied, then verified authenticated upload/read, primary selection, edit preservation, browse thumbnails, and deletion. Its temporary bucket was cleaned up without touching user records.
- V2: 87 unit/component tests passed; production build passed. Legacy web: 140 tests passed with two workers; production build passed, retaining the existing bundle-size warning.
- All 52 desktop/mobile browser cases passed. Media checks decode an authenticated image, verify private/no-store and nosniff headers, deny a request without a session, and deny the image after deletion. Existing showcase and catalog flows remain covered.
- Local HTTP checks returned 200 for API health and both clients. API startup logged policy removal; anonymous access to the development bucket returned 403.

## Rollout boundary

Only local development storage was changed. Deploy both updated clients with the API before enforcing the dedicated remote catalog bucket policy. Follow [storage rollout instructions](../../tools/local-storage/README.md), including checking any external ACL or CDN grants. Old clients expecting public image URLs are incompatible. Previously downloaded or cached copies cannot be recalled. External collection-cover links retain their existing behavior.

## Next task

Implement publication domain and API from the [sharing contract](../16-v2-showcase-sharing-contract.md): reserved slugs, immutable review candidates/editions, generation checks, atomic activation, explicit unpublish and source-deletion suspension, public data allowlists, and checked private derivatives. Include migration/defaults and PostgreSQL concurrency tests. Owner review/publishing UI, visitor routes, and social metadata follow in later tasks; none is implemented here.
