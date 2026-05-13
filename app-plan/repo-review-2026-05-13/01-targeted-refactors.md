# Targeted Refactors

Date: 2026-05-13

This list is ordered by leverage. The first group should be handled before major new features because those features will otherwise compound current hotspots.

## P0 - Stabilize The Development Baseline

1. Fix mobile dependency/typecheck reproducibility.

   `npm.cmd run typecheck:mobile` currently fails locally because mobile dependencies such as React Navigation, Expo Camera, NetInfo, zod, and React Query persistence are not resolved from the installed workspace. Confirm whether `node_modules` is stale, whether workspace install is incomplete, or whether package versions are incompatible with the root overrides. The target state is that `npm ci`, `npm run typecheck:mobile`, and `npm run test:mobile` work from a clean clone.

2. Add a single `verify` script at the repo root.

   Suggested command set: backend tests, web build, web tests, mobile typecheck, mobile tests. This makes local confidence match CI expectations.

3. Fix mojibake/encoding artifacts in docs and comments.

   Several files display corrupted characters for arrows, ellipses, and dashes in PowerShell output. Standardize Markdown and source files on UTF-8 and replace corrupted text. This is low risk but improves professionalism and searchability.

## P1 - Decompose API Endpoint Registration

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

## P1 - Extract Shared Item Attribute Validation

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

## P1 - Move Query Construction Out Of `ItemRepository`

Current hotspot: `packages/infrastructure/Persistence/Repositories/ItemRepository.cs`.

The `QueryAsync` method mixes paging, sorting, full-text-ish search, tag matching, location filters, attribute filters, DTO projection, and primary image selection. This is functional but will be difficult to optimize for large collections.

Refactor target:

- Extract query composition into an internal `ItemQueryBuilder` or extension methods.
- Add query-focused integration tests against relational SQLite or PostgreSQL/Testcontainers if feasible.
- Define supported filter semantics explicitly: tag match mode, attribute value matching by data type, date/number comparisons, null behavior, and case sensitivity.
- Add indexes to match expected query paths, especially collection/name, collection/location, item type, join tables, and attribute lookup.

Follow-up:

- Consider PostgreSQL full-text search or trigram search once collections reach enough size to make `LOWER(...).Contains(...)` expensive.

## P1 - Establish Shared API Contracts

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

## P1 - Split `ItemsPage` Into Workflow Components

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

## P1 - Standardize Error Contracts And Client Error Handling

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

## P2 - Revisit Media Privacy And Storage Lifecycle

Current hotspot: `MinioMediaStorageService.EnsureBucketPublicAsync`.

The service sets a public bucket policy during upload to support public URLs. That is simple for MVP, but many collectors will treat collection data and images as private.

Refactor target:

- Decide whether media should be public, signed, or user-scoped.
- Prefer signed URLs or authenticated proxy endpoints for private collections.
- Move bucket provisioning/policy setup to infrastructure/deployment rather than per upload.
- Add image size limits, thumbnail generation strategy, and content-type verification.

## P2 - Add Transaction Boundaries For Multi-Step Writes

Examples:

- Create item, then record item event.
- Update item, replace attributes/tags, then record item event.
- Delete collection and dependent soft deletes.
- Upload media to object storage, then create database metadata.

Refactor target:

- Introduce explicit EF transactions where multiple database writes must succeed together.
- For object storage plus DB, define compensation behavior or an outbox cleanup job for orphaned assets.

## P2 - Improve Domain Modeling Around Collector Concepts

Current model has item, attributes, media, tags, locations, and events. That is a strong base, but upcoming collector features should not be modeled as ad hoc custom attributes only.

Candidate first-class concepts:

- Acquisition: acquired date, source, price, currency, condition at acquisition.
- Valuation: estimated value, source, date, confidence, change over time.
- Provenance: prior owner, certificate/authentication, notes.
- Condition: standardized condition scale per collection/type.
- Maintenance/reminders: cleaning, grading, certification, battery replacement, insurance review.
- Wishlist/watchlist item: wanted but not owned.

## P2 - Make Web UI More Systematic

Current web CSS and components work, but the app will benefit from a small design system before adding more workflows.

Targets:

- Button variants, icon buttons, form fields, select, chips, drawer, modal, table, empty state, error state.
- Replace character-based icons with an icon library such as lucide-react.
- Improve keyboard/focus management for drawers and modals.
- Add loading skeletons or consistent loading states for dense views.
- Add accessibility tests for dialogs, labels, and keyboard navigation.

## P3 - Performance And Scale Hardening

Add this before encouraging real users to catalog hundreds or thousands of items:

- Query latency budget for item list and search.
- DB indexes aligned with filter/sort paths.
- Cursor pagination or stable pagination for large result sets.
- Lazy load detail/media/event history.
- Virtualized lists on web and mobile.
- Bundle splitting for web route/workflow chunks.

