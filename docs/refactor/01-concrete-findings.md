# Concrete Findings

## P1: Item list cache keys do not include all active filters

Files:

- `apps/web/src/catalog/pages/ItemsPage.tsx:123`

Problem:

The item-list query key includes search text, location, item type, sort, attribute filters, page, and tag IDs, but it does not include:

- `minQuantity`
- `maxQuantity`
- `createdAfter`
- `createdBefore`
- `hasNoLocation`
- `hasNoTags`

Impact:

Changing one of those filters can reuse stale React Query cache entries instead of forcing a refetch. The UI can appear to accept a filter while still showing results from a previous filter state.

Recommendation:

- extract a single canonical filter-key builder
- use the same canonical representation for:
  - React Query keys
  - saved view serialization
  - report drill-through handoff

## P1: "No location" report drill-through is broken

Files:

- `apps/web/src/catalog/pages/ReportsPage.tsx:32`
- `apps/web/src/catalog/pages/ItemsPage.tsx:212`

Problem:

The reports page navigates to the items view with `hasNoLocation=1`, but the items page drill-through effect only reads:

- `tagId`
- `locationId`
- `itemId`

It ignores `hasNoLocation`, so the navigation succeeds but the intended filter is never applied.

Impact:

The user can click a report row and land on an unfiltered items view, which makes the reports feature feel unreliable.

Recommendation:

- standardize report drill-through params
- let the items page hydrate all supported drill-through filters, not just a subset
- add a web test that covers `locationId = null`

## P2: Saved views do not restore item type filters

Files:

- `apps/web/src/catalog/hooks/useItemFilters.ts:83`

Problem:

`useItemFilters.applySavedView(...)` restores search text, location, tags, attribute filters, sort, quantity range, dates, and quick filters, but it does not restore `itemTypeId`.

Impact:

A saved view that was created with an item type filter silently comes back incomplete, which undermines trust in saved views.

Recommendation:

- restore `itemTypeId` in `applySavedView(...)`
- add a focused unit test around saved view application for every supported filter field

## P2: One malformed saved view can break the entire saved-views query

Files:

- `apps/web/src/catalog/hooks/useSavedViews.ts:14`

Problem:

The `select` mapper uses raw `JSON.parse(v.filtersJson)` with no guard. If one saved view contains malformed JSON from legacy data, manual edits, or a migration mistake, the entire query fails.

Impact:

One bad row can take down the whole saved-views experience for a collection.

Recommendation:

- wrap parsing in a safe helper
- drop invalid rows or mark them as corrupted instead of failing the whole query
- optionally parse against a schema before exposing the result to the UI

## P3: Tag multi-select still needs interaction hardening

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

Several files contain mojibake like `â€”`, `â†’`, and `â€¦`.

Impact:

- lowers polish for contributors and reviewers
- makes product copy feel less maintained
- can hide real content-review issues because broken characters become normalized

Recommendation:

- normalize these files to UTF-8 clean text
- add a lightweight docs/content pass as part of the next refactor batch
