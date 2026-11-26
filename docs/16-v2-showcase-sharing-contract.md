# Showcase Sharing and Social Preview Contract

Status (2026-10-04): the private-media prerequisite, publication backend, owner review/publish controls, and visitor experience are implemented; publishing remains disabled by default. Social metadata and cards are also implemented; deployed acceptance remains pending because no V2 environment is available yet. See the [social preview handoff](refactor/18-v2-social-preview-handoff.md) and [rollout checklist](refactor/19-v2-publication-rollout-checklist.md). See the [publication API handoff](refactor/16-v2-publication-api-handoff.md) and [review/visitor handoff](refactor/17-v2-publication-ui-handoff.md).

## Product decision

A shared showcase is an explicitly published edition of a collection. Editing the catalog or saving presentation settings does not silently change that edition. The owner reviews the public presentation, then chooses **Publish showcase** or **Publish changes**. This makes the review describe exactly what a visitor will receive.

The existing `/collections/{collectionId}/showcase` remains the live, private workspace preview. A separate **Review for sharing** flow shows the candidate public edition, including its share card. The two views must be labelled distinctly because the public edition has fewer fields, no workspace links, and different media handling.

Anyone with a published link can open and redistribute it. V1 omits showcases from a directory and sitemap and requests `noindex, nofollow`; this is a discoverability preference, not access control. Do not call a published showcase private or promise that a link cannot be discovered. The owner can unpublish it, which stops new reads from CurateDS; already downloaded content and third-party previews cannot be recalled.

## Repository evidence at design time (before the private-media task)

| Current behavior | Consequence for sharing |
| --- | --- |
| Workspace layout reads the Auth0 session and displays account identity. | Public routes need a separate layout and data loader, outside `(workspace)`. |
| Private showcase uses collection, presentation, summary, and Insights responses and links into item detail/browse. | Reusing the private component with authentication removed would expose the wrong contract and navigation. Share visual primitives, not its data loader or account shell. |
| `GetPublicUrl` produces a direct bucket/object URL containing collection/item IDs. | Do not include these URLs or storage keys in the public DTO or social card. |
| Storage defaults to an anonymous bucket read policy; local media compose enables it explicitly. | Existing catalog media does not currently provide revocable access. A checked proxy alone cannot revoke already-public originals. |
| `EnablePublicReadPolicy=false` skips applying a policy; the initializer does not remove a policy already present. | Changing that setting alone is not a privacy migration. Verify actual storage policy and anonymous reads. |
| Collection and item queries use soft-delete filters; media deletion removes its DB relationship before best-effort object deletion. | Public reads must check the active publication and source lifecycle, rather than relying on object deletion to revoke access. |
| Next.js has separate metadata and image-generation facilities. | Page content, metadata, and share images must consume the same public edition and enforce the same availability rules. |

Implementation references: [storage service](../packages/infrastructure/Storage/MinioMediaStorageService.cs), [storage initializer](../packages/infrastructure/Storage/MediaStorageInitializer.cs), [workspace layout](../apps/web-v2/src/app/(workspace)/layout.tsx), [private showcase](../apps/web-v2/src/components/collection-showcase.tsx), and [delete collection service](../packages/application/Collections/DeleteCollection/DeleteCollectionService.cs).

## Routes and slug lifecycle

| Surface | Proposed route | Boundary |
| --- | --- | --- |
| Live owner preview | `/collections/{collectionId}/showcase` | Existing authenticated workspace |
| Public-edition review | `/collections/{collectionId}/showcase/review` | Authenticated; generic metadata; never publishes on GET |
| Visitor page | `/showcase/{slug}` | Anonymous; dedicated public projection |
| Visitor share card | `/showcase/{slug}/social/{revisionToken}` | Anonymous; active edition only |
| Visitor image | `/showcase/{slug}/media/{revisionToken}/{assetToken}` | Anonymous; active edition and approved asset only |

Slugs are globally unique, lowercase ASCII, 3–80 characters, matching `[a-z0-9]+(?:-[a-z0-9]+)*`. The owner can edit the suggested slug before first publication. Suggest from the collection name; use `collection-<random suffix>` when it contains no usable ASCII characters. Reject unsupported input with a field error rather than silently changing the requested slug on publication.

Claim the slug atomically on first publication with a database unique constraint. Availability checks are advisory; a publish-time conflict returns 409 and preserves the owner draft. Choosing another slug requires a refreshed review before confirmation. A slug is immutable after first publication in V1, survives collection renames and unpublishing, and cannot be reassigned to another collection. Retain a reservation/tombstone when a collection is deleted so an old link cannot identify somebody else's collection. Custom domains, editable published slugs, and redirect aliases are deferred.

Unknown, unpublished, deleted, malformed, and retired-revision routes return the same generic 404 without collection identity or a sign-in redirect. Infrastructure failures return a generic 503 with no stale content. A public GET/HEAD must not create a session, refresh a token, set an account cookie, or depend on Auth0 availability. The existing proxy currently invokes Auth0 middleware broadly; public-route handling needs an explicit branch and regression tests for both signed-in and anonymous visitors.

## Public data allowlist

The API owns a new, versioned `PublishedShowcase` response. Construct it explicitly; never serialize a domain entity, spread an existing workspace response, or accept a client-supplied snapshot as authoritative.

| Included when reviewed and selected | Excluded |
| --- | --- |
| Slug, opaque revision token, publication timestamp, layout and colour preset | Owner/account IDs, names, email, Auth0 data, audit actors, internal collection/item/media/type IDs |
| Collection title, category, description, singular/plural labels | Locations, tag names, custom-field names or values, saved views, activity/history, quantities, arbitrary notes or file metadata |
| Ordered highlights: at most six item names, descriptions, and approved primary-image references | Item detail, edit, browse, Insights, export, upload, and workspace links |
| Recent additions: freeze at most six in created-time-descending order, ID as internal tie-breaker; remove items already in visible highlights | Search, paging, filters, report drill-through, or access to unselected items |
| Selected summary counts: total items, total media, tags in use | Source storage keys, bucket URLs, signed URLs, external cover URLs, original file names |
| Selected twelve-month additions: twelve UTC intervals and counts | Exact individual acquisition timestamps or other unselected analytics |
| Selected type report: up to six groups with names/counts; deterministic count-descending/name ordering, internal ID tie-breaker; total group count if truncated | Type IDs or a link that requires owner access |

Reports and summaries cover the entire current collection, including unpinned items, at the time the edition is prepared. The review must say this explicitly. They are snapshots labelled **As of [publication date]**, not promises of live totals. Do not substitute private Insights endpoints for anonymous report reads. A truncated type report states that it shows the six largest groups; it does not link to private Insights.

The API bounds all content and the complete payload (target maximum 64 KiB of JSON). Use the existing identity/vocabulary limits, plain text only, and a maximum of 1,000 characters per public item description. Any truncation is visible in the review before publication. Image bytes are outside this payload. Arrays may be empty; the visitor receives a calm introduction rather than owner-facing add-item instructions. Public cards are static presentation, with no hidden private hrefs.

Optional sections are omitted from the response when off, not merely hidden with CSS. Public item/asset tokens are publication-local, opaque references and provide no alternate route to the catalog. OpenAPI and the web runtime schema describe only this allowlist. Tests must inspect serialized JSON, HTML, metadata, and image URLs for excluded sentinel values.

## Publication lifecycle and concurrency

Persist publication state separately from `Collection` identity/presentation settings. The conceptual records are a collection-owned publication head (slug, generation, active revision), an immutable edition payload, bounded private image derivatives, and short-lived review candidates. Normal catalog operations remain authoritative; editions are a delivery snapshot, not a second editable catalog.

1. **Prepare review.** An authorized POST constructs a consistent snapshot from owner-scoped data, stages approved media privately, and returns a candidate token, expiry, publication generation, and exact public DTO. Candidates expire after 30 minutes and are owner/collection scoped. Read all source data from a consistent database view. Do image processing outside a long-held database transaction; recheck source availability before accepting the candidate.
2. **Review.** Render the exact candidate response with the same public presentation component and a separately authorized share-card preview. Never render the current live collection as a substitute for the candidate. Show the proposed URL, all visible sections, report scope, image substitutions, and a short explanation of public access. Preparing or viewing a candidate has no anonymous route.
3. **Publish.** An explicit owner mutation names the candidate and expected publication generation. Recheck ownership, expiry, source deletion/revocation, complete staged assets, and slug availability; atomically activate the edition and advance the generation. The browser cannot provide arbitrary public fields or object keys. Expired/stale/invalidated candidates return 409 with a review-again action. Failed publication leaves the last published edition intact. Retrying an already-consumed candidate returns the original success only while that exact edition is still active; after replacement or revocation it returns 409 and cannot reactivate it.
4. **Update.** Catalog and setting edits affect only the live private preview. **Publish changes** prepares and reviews a new edition. Activation replaces the previous edition atomically; new requests to old revision image/card URLs return 404. Images must be ready before activation, so visitors never receive a half-built edition.
5. **Unpublish.** Revoke the active edition in a transaction and advance the generation. Repeated unpublish is safe and returns the current unpublished state. Invalidate outstanding candidates so a delayed publish request cannot undo unpublishing. The slug stays reserved. Republish requires a fresh review.
6. **Source removal.** Collection deletion revokes its publication in the same unit of work. For V1, item or media deletion in a collection suspends its active publication and invalidates candidates, even when the removed item was not featured: counts may depend on it. Deleting a type used by a published type report also suspends affected publications. Ordinary renames/edits leave the reviewed edition unchanged until Publish changes. Explain suspension in owner publication status; never silently republish.

Publish, unpublish, and source-removal writes must serialize per collection or use equivalent checked database concurrency. Checking a dependency before a transaction is insufficient. Test the race where an old publish arrives after unpublish or deletion, not just sequential happy paths. New public reads independently require a live collection and an active edition; cleanup completion is never the access-control mechanism.

Proposed .NET owner API (all require a bearer token and ownership):

| Method and path | Result |
| --- | --- |
| `GET /collections/{id}/publication` | Status, reserved slug, active revision/date, generation, and any suspension reason |
| `POST /collections/{id}/publication/previews` | Prepared review candidate and exact public DTO; no anonymous visibility |
| `GET /collections/{id}/publication/previews/{token}` | Unexpired candidate for its owner only |
| `PUT /collections/{id}/publication` | Activate candidate with expected generation; owner explicitly publishes |
| `DELETE /collections/{id}/publication` | Idempotent revocation; invalidate candidates and return new generation |

Next.js owner BFF routes keep the existing same-origin mutation, bounded-body, session, and schema checks. Anonymous API reads use a new `/showcases/{slug}` family and a dedicated repository/projection; they never infer an owner from a browser-supplied ID or call owner routes with a service-account token. Rate-limit candidate creation and anonymous image processing independently of catalog reads. Exact rate thresholds are deployment configuration to measure during acceptance, not a reason to add a job platform now.

## Media decision and rollout prerequisite

Public editions serve only bounded derivatives of selected uploaded primary images, stored in a separate private namespace or bucket. Resolve source objects through owned DB records, decode approved raster formats, re-encode to remove source metadata, cap dimensions/pixels/bytes, and assign fresh opaque tokens. Use a conservative V1 target of 1,600 pixels on the longest edge and at most 1 MiB per derivative; enforce a separate decoded-pixel limit before allocation. Reject unsupported/failed processing during review with a visible fallback choice; do not activate an edition with missing assets.

External cover URLs remain usable in the private workspace but are not fetched or embedded in V1 public editions. Their ownership, revocation, and server-fetch safety are unresolved. The public review uses the existing theme/initial cover fallback and explains that substitution. There is no generic remote-URL image proxy. SVG, original downloads, EXIF metadata, and arbitrary URL fetches are excluded from public media processing.

Every public image request resolves `(slug, revisionToken, assetToken)` through the active publication before reading storage. Stream bytes through the checked API/web route; do not redirect to storage or issue a durable bearer URL. Use explicit content type, `nosniff`, bounded reads, and the same no-store behavior on success and failure. A signed-in visitor receives the identical public resource, never an owner-only original.

Before public sharing ships, catalog originals must also have a real private-read path:

- Add authenticated, collection/item/asset-scoped reads through the API and a same-origin V2 media route. URLs alone confer no owner access.
- Account for the legacy client, which still consumes existing media DTO URLs. Provide a bearer-authenticated fetch/object-URL adapter or equivalent checked client read before changing bucket access; ordinary `<img>` requests cannot supply its API bearer header.
- Explicitly remove the existing anonymous bucket policy and verify anonymous object GETs fail. Keep server storage credentials for authorized reads. Do not assume the initializer's false flag removes an existing grant or that a successful health endpoint proves media privacy.
- Test both clients, old object URLs, and the new publication derivatives on local MinIO. Apply deployment policy changes only through an explicit rollout, with a recovery path for owner image display that does not republish the bucket.

This brings forward the minimum media-read/privacy work from Slice 7 because otherwise unpublish cannot reliably stop CurateDS from serving linked originals. The design task changes no bucket policies. Already fetched original files remain outside revocation guarantees, regardless of the migration.

Implementation update (2026-10-04): authenticated reads in both clients and the explicit local policy transition are complete; see the [private-media handoff](refactor/15-v2-private-media-handoff.md). Remote enforcement still requires the documented rollout and verification.

Private staged/retired derivatives need retryable cleanup after candidates expire, editions are replaced, or publication is revoked. Record cleanup work durably after DB state changes; failed deletion must leave inaccessible bytes, not a live publication. A bounded application cleanup process is sufficient initially; do not add a queue platform solely for this feature.

## Metadata, share card, and cache policy

The document and metadata share one request-scoped public loader so a single response cannot combine two editions. Implementation update (2026-10-04): the visitor uses an App Router HTML route handler and React's static renderer on each request, preserving explicit 404/503 before sending any HTML. Add metadata to that same document from its already checked DTO rather than fetching a second edition through `generateMetadata`. Use explicit uncached fetches and dynamic rendering; do not enable static generation, ISR, framework data caches, an image-optimizer cache, or CDN caching for public publication resources in V1. Public GET/HEAD success and error responses use `Cache-Control: no-store`. Configure the hosting layer to honor it and test the response from the deployed edge before enabling publishing. There are no public conditional 304 responses in V1.

Metadata comes only from the public DTO: title, a bounded plain-text description or generic fallback, canonical URL, `og:type=website`, `og:title`, `og:description`, `og:url`, and an absolute share-card URL with revision token. Use the configured public web origin, never an untrusted Host header or API/storage origin. Private workspace and review routes retain generic metadata. Missing/unpublished/error states omit collection-specific metadata and imagery, including inherited parent image values.

Render a 1,200 × 630 PNG share card with Next.js `ImageResponse`: collection title, category when present, colour preset, and CurateDS branding. V1 intentionally uses typography and theme rather than catalog photographs, report totals, or owner identity. Ship a local font asset, escape/render text through components, and test long, Unicode, empty, and right-to-left text. Generate from the active immutable edition after checking its revision token; a deleted/unpublished/retired edition returns 404 before image generation. Candidate card previews use a separate authorized route and cannot be used as public image URLs.

Implementation update (2026-10-04): cards shape shipped Noto fonts locally into SVG glyph paths before Next ImageResponse, avoiding external font/emoji fetches and supporting joined Arabic and bidirectional text. Long text is shortened visibly; uncovered scripts and symbols use replacement marks, disclosed in the owner preview. Canonical URLs use the existing APP_BASE_URL. See the social preview handoff for font coverage and packaging details.

Next's bundled metadata guide documents server metadata, request-scoped memoization, and special crawler handling. Use those supported mechanisms; test initial HTML with a regular browser and a metadata-limited bot user agent, rather than relying on client hydration or a logged-in screenshot to validate shareability. The social-image route must apply the access and cache rules explicitly even if a file-convention default would cache its output.

Unpublish acknowledgement means subsequent origin/edge reads of page, JSON, image, and card are denied. It cannot retract a response already in flight, an open tab's rendered pixels, screenshots, downloads, or third-party cached cards. Do not promise immediate deletion from external social systems. Revision tokens avoid reusing an old card URL after an update; they are not authentication credentials.

## Implementation order and acceptance

Keep Slice 6 in progress until the agreed sharing implementation and its publication boundary are validated. Local implementation and automated acceptance are complete; publishing remains disabled by default pending deployed acceptance.

| Next task | Deliverable and acceptance |
| --- | --- |
| 1. Private media reads | API and V2/legacy owner reads; explicit storage-policy transition; old anonymous URL denial; upload/display/delete regressions against real local storage. No public publishing yet. |
| 2. Publication domain and API | Slug reservation, immutable candidates/editions, independent generation checks, source-removal revocation, explicit public DTO, private derivatives, migration/defaults, and PostgreSQL transaction/concurrency tests. |
| 3. Review, publish, and visitor experience | Separate owner review and public layouts; reuse Gallery/Journal visuals; publish/update/unpublish status and recovery; no private navigation or auto-publication; desktop/mobile coverage. |
| 4. Metadata and rollout acceptance | Checked share card, bot HTML, configured canonical origin, deployed no-store behavior, private storage verification, and end-to-end revocation of every public resource. |

Required boundary cases include an anonymous/foreign-owner preview request; forged/expired/stale candidates; concurrent slug claims; duplicate publish retries; publish racing unpublish/source deletion; replaced revision requests; source media failure; empty collections; omitted sections with sensitive sentinel values; API outage; signed-in public visitors; and reports frozen despite subsequent catalog edits. Verify candidate staging and failed publication never expose anonymous content. Snapshot rendering and cleanup must be bounded for large catalogs.

Defer public item-detail pages, discovery/search, passwords or guest accounts, automatic live publishing, analytics, custom domains, custom image templates, and public report drill-through. These additions would require new publication decisions rather than reuse of owner endpoints.
