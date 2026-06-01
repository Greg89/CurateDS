# Targeted Refactors

Date: 2026-05-13 (original) — Status pass: 2026-05-31

This list is ordered by leverage. The first group should be handled before major new features because those features will otherwise compound current hotspots.

**Status legend:** [DONE] — implemented and verified by code inspection. [PARTIAL] — partially done, see notes. [OPEN] — not yet started.

## P0 - Stabilize The Development Baseline

1. **[DONE]** Fix mobile dependency/typecheck reproducibility.

   `npm.cmd run typecheck:mobile` currently fails locally because mobile dependencies such as React Navigation, Expo Camera, NetInfo, zod, and React Query persistence are not resolved from the installed workspace. Confirm whether `node_modules` is stale, whether workspace install is incomplete, or whether package versions are incompatible with the root overrides. The target state is that `npm ci`, `npm run typecheck:mobile`, and `npm run test:mobile` work from a clean clone.

   2026-05-31: Re-verified locally — `npm run typecheck:mobile` passes with no errors and `npm run test:mobile` reports 78/78 passing across 12 suites. The original failure was tied to a stale workspace install state that has since been resolved.

2. **[DONE]** Add a single `verify` script at the repo root.

   Suggested command set: backend tests, web build, web tests, mobile typecheck, mobile tests. This makes local confidence match CI expectations.

   2026-05-31: `npm run verify` now chains `dotnet test`, `build:web`, `test:web -- --run`, `typecheck:mobile`, and `test:mobile`.

3. **[OPEN]** Fix mojibake/encoding artifacts in docs and comments.

   Several files display corrupted characters for arrows, ellipses, and dashes in PowerShell output. Standardize Markdown and source files on UTF-8 and replace corrupted text. This is low risk but improves professionalism and searchability.

## P1 - Decompose API Endpoint Registration — [DONE]

2026-05-31: Split into `CollectionCrudEndpoints.cs`, `ItemEndpoints.cs`, `AttributeDefinitionEndpoints.cs`, `ItemTypeEndpoints.cs`, `SavedViewEndpoints.cs`, `OrganizationEndpoints.cs`, `CollectionReportEndpoints.cs`, `MediaEndpoints.cs`, plus `CollectionResponseMappers.cs`. The original 854-line file is gone. Integration tests remain green.

Current hotspot: `apps/api/Collections/CollectionEndpoints.cs`.

The file registers collections, summaries, reports, activity, exports, saved views, tags, locations, attribute definitions, item types, items, and mapping helpers. This is already too broad.

Refactor target:

- `CollectionEndpoints.cs`: collection CRUD and collection-level routes.
- `ItemEndpoints.cs`: list/create/detail/update/delete item routes.
- `AttributeDefinitionEndpoints.cs`: attribute definition routes.
- `ItemTypeEndpoints.cs`: item type routes.
- `SavedViewEndpoints.cs`: saved view routes.
- `OrganizationEndpoints.cs`: tags and locations.
- `CollectionReportEndpoints.cs`: summary, reports, activity, export.
- `ResponseMappers.cs` or per-feature mappers.

Acceptance criteria:

- No behavior change.
- Existing API integration tests remain green.
- Route paths stay stable.
- Endpoint files can be reasoned about by feature area.

## P1 - Extract Shared Item Attribute Validation — [DONE]

2026-05-31: Implemented as `ItemAttributeValueValidator` in `packages/application/Collections/Shared/`. Both `CreateItemService` and `UpdateItemService` now delegate to it. Covered by `ItemAttributeValueValidatorTests`.

Current hotspots:

- `CreateItemService.ValidateAttributeValues`
- `UpdateItemService.ValidateAttributeValues`

The create and update services duplicate almost identical validation for item-type-compatible attributes and required fields.

Refactor target:

- Introduce an application-layer `ItemAttributeValueValidator` or `ItemAttributeValuePolicy`.
- Return typed validation failures or throw a FluentValidation `ValidationException` consistently.
- Cover the extracted policy with focused unit tests.

Why this matters:

- Item type behavior is central to the product.
- Future features such as templates, bulk import, barcode import, and mobile offline drafts will all need the same validation rules.

## P1 - Move Query Construction Out Of `ItemRepository` — [DONE]

2026-05-31: `ItemQueryBuilder` extracted to `packages/infrastructure/Persistence/ItemQueryBuilder.cs`. The composition concern is solved.

2026-05-31 follow-up (this branch):

- Tag match mode (ALL vs ANY) is now explicit. New `TagMatchMode` enum on `ListItemsQuery`; API request accepts `tagMatchMode=any|all` (default `all`, backwards-compatible).
- New EF migration `AddItemQueryIndexes` adds composite indexes `Items(CollectionId, UpdatedUtc)` (default-sort path) and `ItemTags(TagId, ItemId)` (reverse direction for search-by-tag-name and ANY-mode tag joins).

Still open:

- No PostgreSQL/Testcontainers query-shape tests.
- `ItemRepository.ListByCollectionAsync` (used by export) still loads the full collection without pagination — flagged in `04-cross-reference-and-assessment.md`. Promote to P1 before CSV import lands.

Current hotspot: `packages/infrastructure/Persistence/Repositories/ItemRepository.cs`.

The `QueryAsync` method mixes paging, sorting, full-text-ish search, tag matching, location filters, attribute filters, DTO projection, and primary image selection. This is functional but will be difficult to optimize for large collections.

Refactor target:

- Extract query composition into an internal `ItemQueryBuilder` or extension methods.
- Add query-focused integration tests against relational SQLite or PostgreSQL/Testcontainers if feasible.
- Define supported filter semantics explicitly: tag match mode, attribute value matching by data type, date/number comparisons, null behavior, and case sensitivity.
- Add indexes to match expected query paths, especially collection/name, collection/location, item type, join tables, and attribute lookup.

Follow-up:

- Consider PostgreSQL full-text search or trigram search once collections reach enough size to make `LOWER(...).Contains(...)` expensive.

## P1 - Establish Shared API Contracts — [PARTIAL]

2026-05-31: Web `api.ts` is split by feature (`apps/web/src/api/{collections,items,tags,locations,attributes,item-types,saved-views,media}.ts`) and every module imports zod for response validation. The short-term recommendation is met. OpenAPI generation is still open.

Current hotspots:

- `apps/web/src/api.ts`
- `apps/mobile/src/api/*.ts`
- `apps/api/Collections/*Contracts.cs`

Web and mobile manually duplicate contracts, and mobile uses zod while web trusts `fetch().json()` casts. This increases drift risk as the API grows.

Options:

- Generate OpenAPI from the ASP.NET API and generate TypeScript clients.
- Keep hand-written clients but move request/response schemas into shared TS modules with zod validation for both web and mobile.
- Add contract tests that compare API response fixtures against web/mobile schemas.

Recommended path:

- Short term: split `apps/web/src/api.ts` by feature and add zod parsing to web responses.
- Medium term: generate clients from OpenAPI once endpoint modules are decomposed.

## P1 - Split `ItemsPage` Into Workflow Components — [DONE]

2026-05-31: `useItemMutations`, `ItemDetailDrawer`, `ItemFormDrawer`, and `ItemsToolbar` are all extracted. Filtering/form/saved-view hooks were already in place. The page is now orchestration.

Current hotspot: `apps/web/src/catalog/pages/ItemsPage.tsx`.

The page owns filters, search params, item selection, create/update/delete mutations, media mutations, drawer state, form submission, auto-selection, report drill-through, toolbar rendering, list rendering, detail drawer, and form drawer.

Refactor target:

- `ItemsToolbar`
- `ItemsFilterDrawer` or `ItemsFilterPanelContainer`
- `ItemListSection`
- `ItemDetailDrawer`
- `ItemFormDrawer`
- `useItemMutations`
- `useItemSelection`
- `useReportDrillThrough`

Acceptance criteria:

- The page becomes orchestration, not detailed UI and mutation plumbing.
- Existing web tests remain green.
- Drawer open/close and selected item behavior are covered.

## P1 - Standardize Error Contracts And Client Error Handling — [PARTIAL]

2026-05-31: Bare `Results.NotFound()` calls have been removed from API code; everything goes through `ApiResponses.NotFound("...")`. Web `readValidationMessage` exists in `apps/web/src/api/http.ts`.

2026-05-31 follow-up (this branch):

- `ApiResponses.Validation(ValidationException)` now reads `ValidationFailure.ErrorCode` and surfaces the first non-empty value as the problem `code`. Generic failures still emit `validation_error`.
- Duplicate-name failures from `CreateTagService` and `CreateLocationService` are now tagged with `duplicate_tag` / `duplicate_location` codes.
- Removed the dead `DbUpdateException → Conflict` catch in tags (the validation check fires first; the catch was unreachable).
- New web client helper `readProblemDetails` in `apps/web/src/api/http.ts` returns a typed `{ message, code, errors }` shape; `readValidationMessage` is preserved as a thin wrapper for backwards compatibility. Covered by 13 unit tests.
- New API integration test asserts duplicate-location returns `code: duplicate_location`.

Still open: machine-readable codes for the remaining targeted UX cases (required-attribute-missing, item-type-deleted-while-editing, media-rejected) and surfacing field-level errors in the web UI beyond the first message.

Current state:

- API returns validation problem responses, conflicts, not-found responses, and some plain `Results.NotFound()`.
- Web often collapses errors into generic messages.
- Mobile has an `ApiError` type but screen-level messages are still generic.

Refactor target:

- Define a consistent error response shape for validation, conflict, not found, auth failure, and unexpected errors.
- Use stable machine-readable error codes where user flows need targeted handling.
- Add client helpers to parse and display field-level errors.

High-value examples:

- Duplicate tag/location names.
- Required attribute value missing.
- Item type deleted while editing.
- Media upload size/content-type rejected.

## P2 - Revisit Media Privacy And Storage Lifecycle — [PARTIAL] (split into two tickets)

2026-05-31: The active-bug half is fixed — `UploadAsync` no longer calls `EnsureBucketPublicAsync` on every upload. Bucket provisioning now lives in `MediaStorageInitializer` and runs once at startup.

The product half is still open and should be tracked as its own item:

- **Media privacy decision (NEW P1):** decide between signed URLs, an authenticated proxy endpoint, or keep public-by-default. The current bucket policy still grants anonymous `s3:GetObject` to `*`. This must be resolved before any feature that targets insurance/valuation users.
- **Orphaned media on collection delete (NEW P1, was Finding E):** `DeleteCollectionService` does not remove media assets from object storage. Pair this work with the privacy decision since both touch `IMediaStorageService`.

Current hotspot: `MinioMediaStorageService.EnsureBucketPublicAsync`.

The service sets a public bucket policy during upload to support public URLs. That is simple for MVP, but many collectors will treat collection data and images as private.

Refactor target:

- Decide whether media should be public, signed, or user-scoped.
- Prefer signed URLs or authenticated proxy endpoints for private collections.
- Move bucket provisioning/policy setup to infrastructure/deployment rather than per upload.
- Add image size limits, thumbnail generation strategy, and content-type verification.

## P2 - Add Transaction Boundaries For Multi-Step Writes — [OPEN]

2026-05-31: No `BeginTransactionAsync` calls anywhere in `packages/`. Update flows still write item / tags / attributes / event without an explicit transaction. **Sequence this before P2-C (collector domain models)** — adding acquisition/valuation/condition entities will multiply multi-table writes; lock down transactions first to avoid writing the new features twice.

Examples:

- Create item, then record item event.
- Update item, replace attributes/tags, then record item event.
- Delete collection and dependent soft deletes.
- Upload media to object storage, then create database metadata.

Refactor target:

- Introduce explicit EF transactions where multiple database writes must succeed together.
- For object storage plus DB, define compensation behavior or an outbox cleanup job for orphaned assets.

## P2 - Improve Domain Modeling Around Collector Concepts — [OPEN] (tracked as roadmap M3)

2026-05-31: This is a product/feature design decision rather than a refactor. The work is tracked under Milestone 3 in `02-feature-roadmap.md`. Schema design must precede implementation.

Current model has item, attributes, media, tags, locations, and events. That is a strong base, but upcoming collector features should not be modeled as ad hoc custom attributes only.

Candidate first-class concepts:

- Acquisition: acquired date, source, price, currency, condition at acquisition.
- Valuation: estimated value, source, date, confidence, change over time.
- Provenance: prior owner, certificate/authentication, notes.
- Condition: standardized condition scale per collection/type.
- Maintenance/reminders: cleaning, grading, certification, battery replacement, insurance review.
- Wishlist/watchlist item: wanted but not owned.

## P2 - Make Web UI More Systematic — [OPEN]

2026-05-31: Not started. Should be sequenced before adding import/valuation/loan/sharing UI.

Current web CSS and components work, but the app will benefit from a small design system before adding more workflows.

Targets:

- Button variants, icon buttons, form fields, select, chips, drawer, modal, table, empty state, error state.
- Replace character-based icons with an icon library such as lucide-react.
- Improve keyboard/focus management for drawers and modals.
- Add loading skeletons or consistent loading states for dense views.
- Add accessibility tests for dialogs, labels, and keyboard navigation.

## P3 - Performance And Scale Hardening — [OPEN]

2026-05-31: No new indexes, no cursor pagination, no route-level code splitting on web (the 512 kB chunk warning still applies), no virtualized lists. Export still loads the full collection eagerly.

Add this before encouraging real users to catalog hundreds or thousands of items:

- Query latency budget for item list and search.
- DB indexes aligned with filter/sort paths.
- Cursor pagination or stable pagination for large result sets.
- Lazy load detail/media/event history.
- Virtualized lists on web and mobile.
- Bundle splitting for web route/workflow chunks.

## NEW P1 - CRUD Gaps For Tags / Locations / Attribute Definitions — [OPEN]

2026-05-31: Promoted from `04-cross-reference-and-assessment.md` Finding A.

The API has `POST` and `DELETE` for tags, locations, and attribute definitions but no `PUT`/`PATCH`. A typo in a tag name today means delete + recreate + re-tag every item that referenced it. This is a one-afternoon CRUD gap with high real-user value, and the cost will compound as users accumulate data.

Target endpoints:

- `PUT /tags/{tagId}` — name only.
- `PUT /locations/{locationId}` — name + description.
- `PUT /collections/{id}/attribute-definitions/{id}` — name, isRequired, isFilterable. Do not allow changing `dataType` or `key` — those are structural and would require migration.

Acceptance:

- Validation rejects duplicate names within scope.
- Existing references continue to resolve (renaming a tag does not orphan items).
- Web/mobile API clients gain matching update functions and zod schemas.

## Tracked Findings From `04-cross-reference-and-assessment.md`

These were called out in the cross-reference document but never assigned priority lanes. As of 2026-05-31:

- **Finding A — Update endpoints for tags / locations / attribute defs.** Promoted to P1 above.
- **Finding B — `primaryImageUrl` storage-key vs URL mismatch.** [DONE] 2026-05-31: `ListItemsService` maps storage keys to public URLs at the application boundary. Repository now returns `ItemSummaryProjection` with `PrimaryImageStorageKey` instead of misusing the `PrimaryImageUrl` field on the DTO — the named-mismatch trap is removed. New integration test `GetItems_ShouldReturnPrimaryImageUrl_PrefixedWithPublicBaseUrlAndBucket` locks in the expected URL composition.
- **Finding C — Fragile `attributeFilters[]` query-string encoding.** [OPEN] P2. Tighten when implementing the next round of advanced filter UX.
- **Finding D — Unvalidated `SavedView.FiltersJson` on write.** [OPEN] P2. Add structural JSON validation in `CreateSavedViewService` / its FluentValidation validator.
- **Finding E — Orphaned media on collection delete.** [OPEN] Promoted to P1 alongside the media-privacy decision (see P2-A above).

