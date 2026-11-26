# Concrete Findings

Status updated: 2026-10-02

## Done: Item list cache keys include all active filters

Files:

- `apps/web/src/catalog/pages/ItemsPage.tsx`
- `apps/web/src/catalog/utils.ts`
- `tests/Web.UnitTests/src/catalog/utils.test.ts`

Status:

The item-list query now uses `buildItemFiltersCacheKey(...)`, which delegates to the same normalized serialization used by saved views. Unit coverage verifies quantity filters and quick filters change cache identity, and equivalent filters normalize to the same key.

## Done: Report drill-through consumes generated filters

Files:

- `apps/web/src/catalog/pages/ReportsPage.tsx`
- `apps/web/src/catalog/pages/ItemsPage.tsx`
- `apps/web/src/api/items.ts`
- `tests/Web.UnitTests/src/catalog/utils.test.ts`

Status:

Reports build item filter search params through `buildItemFiltersSearchParams(...)`. The items page hydrates all supported filter params through `parseItemFiltersSearchParams(...)`, including `hasNoLocation` and `hasNoTags`.

## Done: Saved views restore item type filters

Files:

- `apps/web/src/catalog/hooks/useItemFilters.ts`
- `tests/Web.UnitTests/src/catalog/catalog-ui.test.tsx`

Status:

`applySavedView(...)` now delegates to `applyItemFilters(...)`, which restores the normalized `itemTypeId` with the rest of the filter state. Web UI coverage applies a saved view with `itemTypeId`, normalized tags, and quick filters.

## Done: Malformed saved views do not break the query

Files:

- `apps/web/src/catalog/hooks/useSavedViews.ts`
- `apps/web/src/catalog/utils.ts`
- `tests/Web.UnitTests/src/catalog/catalog-ui.test.tsx`
- `tests/Web.UnitTests/src/catalog/utils.test.ts`

Status:

The saved-view query now parses through `tryParseSavedViewFilters(...)` and drops invalid rows instead of failing the entire saved-view experience.

## Done: Item drawers no longer remain mounted after close

Files:

- `apps/web/src/catalog/components/ItemFormDrawer.tsx`
- `apps/web/src/catalog/components/ItemDetailDrawer.tsx`
- `tests/Web.UnitTests/src/catalog/catalog-ui.test.tsx`

Status:

The item form and detail drawers now unmount when closed. This fixed the beta smoke-test regression where the Create Item drawer could appear over Settings and refuse to close.

## Done: Saved-view filter JSON shape is validated on write

`CreateSavedViewCommandValidator` parses JSON and checks supported field names/types and sort values. Invalid nonempty payloads use `invalid_saved_view_filters`. Application validator tests and API integration coverage are present. This is shape validation, not reference-existence validation.

## Done: Tag picker baseline and focus hardening

`TagMultiSelect` already supported outside-click and Escape close with focus return. The October continuation adds initial checkbox focus, close when focus leaves the component, and reset when disabled. The control remains a group of native checkboxes with Tab/Shift+Tab and Space navigation; it does not advertise menu semantics. Dedicated tests cover these behaviors.

## Done: Explicit transaction implementation

`ICatalogUnitOfWork` and `EfCatalogUnitOfWork` coordinate writes, including item create/update/delete and other catalog services. The relational path opens and commits a transaction unless one is already active. Non-relational providers save without a database transaction.

`UploadItemMediaService` attempts object deletion if database persistence fails. Cleanup failure preserves the original exception; orphan repair remains a follow-up.

## Done: Relational rollback coverage for item writes

`ItemTransactionTests` supports SQLite and PostgreSQL 17, using real application services/repositories and a rejecting audit-event trigger. Create/update/delete each have rollback and commit cases. The failure path flushes item changes before inserting the event and checks persistence with a fresh context. `CollectionApiFactory` still uses EF InMemory; PostgreSQL mode applies migrations to fresh test databases and has passed all six cases. Existing production data and broader provider queries are outside this fixture.

## Done: Portable storage tests

`MinioMediaStorageServiceTests` now uses `FakeS3Server`, a Kestrel fixture that binds loopback port zero directly. It captures bodies asynchronously, stores snapshots in a concurrent queue, reports handler failures on disposal, and awaits shutdown. Existing HTTP wire assertions are retained; a parallel-upload test verifies endpoint isolation. The renamed HTTPS transport smoke test is explicitly not proof of the live signing header, which remains follow-up work.

## Follow-up: Documentation maintenance

The top-level README now lists .NET 10, matching the project target and SDK family in `global.json`. The June encoding observations are historical; a broader content audit remains optional follow-up. Broader V2 planning lives in `docs/app-plan`; keep future refactor notes aligned with that scope.
