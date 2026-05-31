# Progress And Next Priorities

Date: 2026-05-31

This document is the canonical "where are we now and what's next" view. It
consolidates the status pass over the original 2026-05-13 review with the
refined feature roadmap. Read this first; the older documents remain as the
detailed reasoning behind each item.

## Verified By Code Inspection On 2026-05-31

Method: direct read of `apps/api/Collections/`, `apps/web/src/api/`,
`apps/web/src/catalog/`, `packages/application/Collections/`, and
`packages/infrastructure/`.

## What's Done

| Item | Evidence |
|------|----------|
| P1-A — Decompose `CollectionEndpoints.cs` | Split into `CollectionCrudEndpoints`, `ItemEndpoints`, `AttributeDefinitionEndpoints`, `ItemTypeEndpoints`, `SavedViewEndpoints`, `OrganizationEndpoints`, `CollectionReportEndpoints`, `MediaEndpoints`, plus `CollectionResponseMappers`. |
| P1-B — Shared item attribute validator | `packages/application/Collections/Shared/ItemAttributeValueValidator.cs`, used by `CreateItemService` and `UpdateItemService`, covered by `ItemAttributeValueValidatorTests`. |
| P1-C — `ItemQueryBuilder` extraction (composition) | `packages/infrastructure/Persistence/ItemQueryBuilder.cs`. |
| P1-C — Tag match mode (ALL/ANY) explicit | `TagMatchMode` enum on `ListItemsQuery`; `tagMatchMode=any\|all` query param in `ListItemsRequest`; branch in `ItemQueryBuilder`. |
| P1-C — Composite indexes | EF migration `AddItemQueryIndexes` adds `Items(CollectionId, UpdatedUtc)` (default sort) and `ItemTags(TagId, ItemId)` (reverse-direction joins). |
| P1-D — Web API split + zod | All eight modules under `apps/web/src/api/` import `zod`; the monolithic `api.ts` is gone. |
| P1-E — `ItemsPage` decomposition | `useItemMutations`, `ItemDetailDrawer`, `ItemFormDrawer`, `ItemsToolbar` extracted. |
| P1-F — Unified `NotFound` responses | Bare `Results.NotFound()` removed; everything routes through `ApiResponses.NotFound`. |
| P1-F — Machine-readable error codes (duplicate-name) | `ApiResponses.Validation` reads `ValidationFailure.ErrorCode`; `CreateTagService` and `CreateLocationService` set `duplicate_tag` / `duplicate_location`; covered by integration tests. Web client exposes typed `readProblemDetails` helper. |
| P2-A bug-fix half — Bucket provisioning out of upload | `MinioMediaStorageService.UploadAsync` no longer touches bucket policy. Provisioning lives in `MediaStorageInitializer`. |
| P0-1 — Mobile typecheck reproducibility | `npm run typecheck:mobile` and `npm run test:mobile` (78 tests / 12 suites) pass locally. |
| P0-2 — `verify` script parity with CI | Root `verify` chains `dotnet test`, `build:web`, `test:web`, `typecheck:mobile`, `test:mobile`. |

## What's Open

Sorted by recommended sequence, not by original priority label.

### Tier 1 — Do before any new feature work

1. **`primaryImageUrl` storage-key vs URL mismatch (Finding B, promoted to P1).**
   `ItemSummaryDto.PrimaryImageUrl` is currently populated with a raw storage
   key, not a public URL. Verify on the live web client; if image src is
   broken when `PublicBaseUrl` is non-trivial, fix before any new feature lands
   that surfaces images.
2. **PUT endpoints for tags / locations / attribute defs (Finding A, promoted to P1).**
   One-afternoon CRUD gap. Pain compounds with every day of real data.

### Tier 2 — Foundation for the next feature wave

3. **Transaction boundaries (P2-B).** Wrap multi-step writes in
   `BeginTransactionAsync`. Sequence this **before** Milestone 3 (acquisition /
   valuation / condition) so the new entities don't lock in non-atomic patterns.
4. **Media privacy decision + orphaned-media cleanup on delete (P2-A product half + Finding E).**
   Decide: signed URLs, authenticated proxy, or stay public-by-default.
   Pair with the cleanup pass in `DeleteCollectionService` since both touch
   `IMediaStorageService`. Must land before any feature targeting insurance /
   valuation users.
5. **Web design system (P2-D).** Sequence before importing/valuation/loan/sharing
   UI lands; otherwise each new workflow accretes ad-hoc styles.
6. **`ItemRepository.ListByCollectionAsync` streaming/paged refactor.** The
   export path loads the entire collection into memory. Promote to P1 before
   CSV import (Milestone 1) ships, since round-trip workflows will OOM on large
   collections.

### Tier 3 — Long-tail correctness and scale

7. **Machine-readable error codes (long tail).** Duplicate-name codes are done
   (`duplicate_tag`, `duplicate_location`). Still open: `required_attribute_missing`,
   `item_type_deleted_while_editing`, `media_rejected`, plus surfacing field-level
   errors in the web UI beyond the first message.
8. **`SavedView.FiltersJson` validation (Finding D).** Add structural JSON
   validation in `CreateSavedViewService` / its FluentValidation validator.
9. **`attributeFilters[]` query-string encoding (Finding C).** Replace with
   typed query params or JSON-encoded list when the next advanced-filter UX
   lands.
10. **Cursor pagination + virtualized lists** (web and mobile).
11. **Route-level code splitting** on web; the 512 kB chunk warning still applies.
12. **OpenAPI generation** for typed clients once the API is stable.
13. **PostgreSQL/Testcontainers query-shape tests** for `ItemQueryBuilder`.
14. **Encoding artifacts in docs/comments** (P0-3, downgraded to P3).

## Next Feature Priorities (Refined 2026-05-31)

Pulled from `02-feature-roadmap.md`. The sequence below merges remaining
refactors with feature work \u2014 this is the actual order to ship in.

| # | Item | Source | Why now |
|---|------|--------|---------|
| 1 | Tier 1 refactors above (primary image URL, PUT endpoints) | This doc | Cheap; remove ongoing pain. |
| 2 | Restore deleted item / collection (recycle bin UX) | Roadmap M0 | Trust prerequisite for everything else. |
| 3 | Streaming / paged on-demand export with media manifest | Roadmap M0 + refactor | Trust + perf prerequisite for import. |
| 4 | Transaction boundaries (P2-B) | Refactor | Prerequisite for M3 entities. |
| 5 | Media privacy decision + orphaned-media cleanup | Refactor | Prerequisite for insurance/valuation users. |
| 6 | Web design system seed (button, field, drawer, modal, table, empty/error states, icon library) | Refactor | Prerequisite for all new UI workflows. |
| 7 | CSV import with column mapping, preview, dry-run | Roadmap M1 | High friction-removal value once #2 + #3 are done. |
| 8 | Bulk edit (tags, locations, item type, attributes) | Roadmap M1 | Pairs naturally with import. |
| 9 | Mobile offline draft queue | Roadmap M2 | Mobile capture is the differentiator. |
| 10 | Loan tracking (status + borrower + due date + reminder) | Roadmap M2 (promoted) | Cheap, viral, broad audience. |
| 11 | Wishlist / watchlist | Roadmap M3 leading edge (promoted) | Drives return visits before cataloging is "done". |
| 12 | Acquisition records (date, source, paid, currency, seller, receipt photo) | Roadmap M3 | Foundation of valuation/insurance story. |
| 13 | Condition model with templates | Roadmap M3 | Foundation of grading/sale story. |
| 14 | Duplicate detection (name + barcode/serial; image hash later) | Roadmap M1 | Best fit alongside import. |
| 15 | Private share links (no public showcase yet) | Roadmap M5 leading edge | Captures ~90% of sharing demand at ~10% of cost. |
| 16 | ISBN scan + lookup (Open Library / Google Books) | Roadmap M6 v1 | Proof of the adapter abstraction. |

Items intentionally **not** in the near-term queue:

- Public collection showcase pages — deferred past M5.
- Natural-language search — cut.
- Discogs / BoardGameGeek / card-pricing adapters — wait for ISBN flow to prove
  the pattern and for user demand to pick the next vertical.
- Receipt/email import, marketplace watchlists, scheduled valuation refresh,
  webhooks — all deferred until adapter v1 ships.

## Open Product Questions Still Unresolved

From `03-open-questions-and-decisions.md`, these remain unanswered as of
2026-05-31 and gate the milestones above:

1. Who is the first serious user? (Casual hobbyist vs. high-value collector vs.
   reseller vs. archivist vs. household-inventory vs. insurance-focused.) The
   answer changes priority among M0/M2/M3.
2. Should media be private-by-default? (Required input to Tier 2 #6.)
3. Should tags and locations remain global per user, or become collection-scoped?
4. Is mobile a full management app or a capture/search companion? (Recommendation
   stands: companion first.)

Recommend locking these in the next planning session before starting Tier 2
work.
