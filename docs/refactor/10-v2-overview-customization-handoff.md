# V2 Slice 5: Pinned Items And Overview Handoff

Status (2026-10-03): this task is implemented. Subsequent Slice 5 completion is recorded in [the labels and fields handoff](11-v2-labels-and-fields-handoff.md).

## Delivered

- Settings now includes **Shape your overview**: show/hide the cover and story, summary counts, pinned items, and recently added items. Choices are saved independently of collection identity.
- A searchable, paged item finder selects up to six distinct items from the active collection. Pins have explicit earlier/later controls and removal, and their chosen order survives saves and reloads.
- Hiding pinned items keeps the selection. Failed saves preserve the draft; discard restores the last saved settings. A removed selection has a recoverable save error.
- Overview shows pinned and recent items through a shared responsive card component with primary-image/fallback handling. Item links stay collection-scoped. Browse, add-item, and customization links remain available even with every optional section hidden.
- Deleted items disappear from the returned pinned list without making the overview fail. Foreign or missing items cannot be added. Empty collections retain first-item guidance.
- Owner-scoped GET/PUT `/collections/{collectionId}/presentation`, regenerated OpenAPI contracts, runtime response validation, and session/origin checks at the web boundary. Item edits, media changes, and deletion invalidate presentation and overview caches.
- The additive `20261003133255_AddCollectionPresentation` migration stores four section flags and an ordered, bounded pin list. Existing collections start with all sections enabled and no pins. Ordered IDs use a converted text column with structural EF change tracking; display queries recheck active collection membership and soft deletion.

## Validation

- Full .NET solution: 323 passed (57 domain, 120 application, 119 API, 27 infrastructure); one opt-in media test skipped.
- All 27 infrastructure cases also passed against isolated PostgreSQL 17. The new case upgrades a collection inserted under the previous schema, verifies default values, and checks false flags, ordered pins, primary image URLs, foreign-item rejection, deletion, and clearing through fresh contexts.
- V2: 62 unit/component tests and production build passed.
- All 32 desktop/mobile browser cases passed across the complete run and focused reruns. The initial failures were in an older Settings test that switched collections before its navigation finished; it now waits for the Settings route. Pinning coverage includes ordering, search/pagination, failed-save recovery, six-item limit, removal, reloads, hidden sections, deletion, and collection switching.
- Desktop/mobile screenshots were reviewed. Browser checks use isolated API/session fixtures; API and relational tests verify actual persistence separately.
- Local Docker API rebuilt with the media override preserved. Migration applied at startup; local preview remains available.
- Legacy web and live Auth0 acceptance were not rerun; neither client authentication nor legacy behavior was changed.

## Continue here

The existing Forest/Clay/Slate presets, identity editing, pinned content, and configurable overview sections are available. Collection-specific labels and custom-field definition choices are now complete; see [the labels and fields handoff](11-v2-labels-and-fields-handoff.md). Continue with Slice 6: Showcase V1.

Pins are private workspace presentation choices. This task does not create a public showcase or sharing controls. Optional section order is fixed; only pinned-item order is editable.
