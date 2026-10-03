# V2 Slice 4 Handoff

Status (2026-10-03): implemented and validated. Next scope is Slice 5: Collection Customization.

## Delivered

- Collection Insights at `/collections/[collectionId]/insights`, with collection identity, useful empty states, retry actions, and navigation that preserves the Insights section when switching collections.
- Cards for total items, additions this month, missing tags, and missing locations. A twelve-month chart groups currently kept items by creation month in UTC. Every card and chart bar opens the corresponding browse filter.
- Location, tag, and item-type breakdowns, plus selectable filterable custom fields. Custom values are grouped in SQL, limited to the twenty most common values, and accompanied by the total number of items with a value. Exact drill-through supports text/SingleSelect, integer, decimal, Boolean, and date values.
- Paged collection activity with item links. Activity now includes soft-deleted item history consistently with the reported total; deleted item links use the existing unavailable-item recovery screen.
- Named saved views from Browse, also accessible from Insights. Save errors retain the draft, removal requires inline confirmation, and restoration preserves filters and sorting while starting on page one.
- An authenticated, owner-scoped API endpoint and session-backed web routes for Insights, activity, and saved views. OpenAPI response metadata, generated contracts, runtime validation, and mutation cache invalidation cover the new workflow.
- Additive item query filters for exact custom-field values, missing item types, and an exclusive creation-date upper bound. Existing inclusive date and text-contains attribute filters retain their behavior.
- Unsupported saved-filter JSON fails closed. The legacy client hides saved views containing V2-only fields rather than silently dropping those filters and showing broader results.

## Validation

- Full .NET solution: 308 passed (55 domain, 120 application, 107 API, 26 infrastructure). The opt-in real-media test was skipped; its Slice 3 acceptance remains recorded separately.
- All 26 infrastructure cases also passed against an isolated PostgreSQL 17 container with repository migrations. New coverage checks aggregate/drill-through agreement, decimal storage precision, false Boolean values, UTC month boundaries, ownership, soft deletion, empty/high-cardinality data, and activity pagination.
- V2: 56 unit/component tests and the production build passed.
- All 24 desktop/mobile browser cases passed in one complete run. New cases cover insight retries, activity pagination, custom-field drill-through, saving/restoring/removing a view, failed-save recovery, and collection switching. Desktop/mobile screenshots were reviewed.
- Legacy web: 137 tests and production build passed. An initial run timed out waiting for one reports-page heading during concurrent verification; the full rerun passed. The existing bundle-size warning remains.
- Browser checks use isolated session/API fixtures. Backend integration tests separately verify the real API and relational query behavior.
- Local Docker API was rebuilt with the media-storage override preserved; API health and the restarted V2 preview returned HTTP 200.
- No database migration was needed. Live Auth0 acceptance remains complete from Slice 1.

## Boundaries and next step

Growth shows items still kept, not historical totals that include deleted items. Tag counts can overlap. Custom-field results show up to twenty values, not every distinct value. Category belongs to the collection in the current model, so Insights presents collection category in its identity and groups items by type.

Saved views persist filters and sorting, not pagination or grid/list presentation. V2 accepts supported legacy saved filters; legacy cannot open views using V2-only filters. Custom-field choice-list configuration remains outside the existing API contract.

Continue with [Slice 5: Collection Customization](../15-v2-roadmap.md#slice-5-collection-customization): collection identity editing, themes/presets, featured and pinned items, configurable overview sections, and collection-specific metadata choices. Definition management still lives in the existing web until that work is implemented.
