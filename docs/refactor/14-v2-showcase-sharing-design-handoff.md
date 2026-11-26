# V2 Slice 6: Sharing Design Handoff

Status (2026-10-03): the sharing and social-preview design task is complete. Public publishing is not implemented; Slice 6 remains in progress.

Implementation update (2026-10-04): the private-media prerequisite below is now complete and validated locally; see the [private-media handoff](15-v2-private-media-handoff.md). The findings and next-task section below record the state when this design was written. Publication domain and API are next.

## Delivered

The [showcase sharing contract](../16-v2-showcase-sharing-contract.md) defines the next implementation:

- A reviewed public edition, explicitly published or updated by the owner. Live catalog edits and saved showcase settings do not automatically change it.
- Stable, globally unique human-readable slugs at `/showcase/{slug}`, reserved after unpublishing/deletion so old links cannot be reassigned.
- A dedicated public data allowlist, bounded featured/recent items and frozen optional reports, with no account details, storage keys, private navigation, or owner API access.
- Owner-scoped review candidates, atomic activation, generation checks, retry behavior, unpublish, and source-deletion suspension. Failed writes preserve the prior edition; stale requests cannot reactivate revoked content.
- Checked private image derivatives, theme-based public covers when the private cover uses an external URL, and a text/theme share card generated only from the active public edition.
- Explicit no-store responses for page, JSON, media, and social image, including failures; generic unavailable metadata; tests for anonymous and signed-in visitors and metadata bots.
- A realistic revocation promise: deny subsequent CurateDS reads, without claiming to erase downloads or third-party copies.

## Repository finding that changes implementation order

Catalog media currently uses direct public object URLs. `MediaStorageInitializer` applies anonymous bucket reads when enabled; setting `EnablePublicReadPolicy=false` does not remove an existing policy. Protecting a new showcase route would not revoke those original links.

The next task therefore brings forward the minimum media-read/privacy work from Slice 7. Both V2 and the legacy client need authenticated media reads before the bucket policy can change. The sharing contract includes rollout and real-storage acceptance criteria; this task changes no storage settings, application behavior, or user data.

## Validation

Reviewed the contract against the current workspace/Auth0 boundary, showcase data and navigation, storage adapter and initializer, soft-delete filters, collection/media deletion services, and bundled Next.js metadata guidance. Checked document links and whitespace. Application tests were not rerun for this documentation-only task.

## Next task

Implement private catalog-media reads through the .NET API, V2 same-origin route, and legacy client adapter. Validate ownership, old anonymous URL denial after the explicit policy transition, and upload/display/delete behavior with local MinIO. Preserve the existing private showcase while doing this. Publication storage/API and public pages follow as separate tasks in the sequence specified by the contract.
