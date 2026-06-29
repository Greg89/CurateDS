# Concrete Findings

Status updated: 2026-06-29

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

## P1: Saved-view filter JSON is not validated on write

Files:

- `packages/application/Collections/CreateSavedView/CreateSavedViewCommandValidator.cs`
- `packages/application/Collections/CreateSavedView/CreateSavedViewService.cs`

Problem:

The web client now safely ignores malformed saved views, but the API still accepts raw `FiltersJson` when a saved view is created. Bad data can still enter persistence through old clients, manual requests, or future client drift.

Impact:

One malformed row no longer breaks the web query, but the server still allows corrupted saved-view data to accumulate.

Recommendation:

- validate that `FiltersJson` is valid JSON
- validate the JSON shape against the supported item-filter fields
- return a stable validation error code for invalid saved-view filters

## P2: Tag multi-select still needs interaction hardening

Files:

- `apps/web/src/catalog/components/TagMultiSelect.tsx:38`

Problem:

The newer tag multi-select is directionally better than the previous checkbox wall, but it is still interaction-fragile:

- no click-outside close behavior
- no Escape-key close behavior
- no focus management after open/close
- no keyboard navigation model beyond native checkbox tabbing

Impact:

As tag counts grow, this control becomes a frequent interaction point. Without basic menu behavior, it will feel rough on keyboard and assistive-tech paths.

Recommendation:

- treat it as a first-class popover/listbox-style control
- add outside-click and Escape handling
- return focus to the trigger after close
- add web tests for keyboard interaction

## P3: Repository documentation has visible encoding regressions

Files:

- `README.md:5`
- `README.md:9`
- `README.md:26`
- `apps/web/src/catalog/pages/ReportsPage.tsx:60`
- `apps/web/src/catalog/pages/ReportsPage.tsx:101`

Problem:

Several files contain mojibake or shell-fragile punctuation such as broken dashes, arrows, and ellipses.

Impact:

- lowers polish for contributors and reviewers
- makes product copy feel less maintained
- can hide real content-review issues because broken characters become normalized

Recommendation:

- normalize these files to UTF-8 clean text
- add a lightweight docs/content pass as part of the next refactor batch

## P2: Multi-step writes need explicit transaction boundaries

Files:

- `packages/application/Collections/CreateItem/CreateItemService.cs`
- `packages/application/Collections/UpdateItem/UpdateItemService.cs`
- `packages/application/Collections/DeleteItem/DeleteItemService.cs`

Problem:

Item create, update, and delete flows write item state and item events as separate steps without an explicit transaction boundary.

Impact:

If a later write fails, the earlier state change can already be persisted. That risk grows as acquisition, valuation, condition, and other multi-table features are added.

Recommendation:

- decide on a transaction abstraction before implementing more domain entities
- wrap the item write plus item-event write in one transaction
- define separate compensation behavior for object storage plus database flows
