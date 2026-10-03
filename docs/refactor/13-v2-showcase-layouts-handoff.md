# V2 Slice 6: Showcase Layouts and Reports Handoff

Status (2026-10-03): implemented and validated. Slice 6 remains in progress.

## Delivered

- Collection Settings now has a Showcase section with saved Gallery and Journal layouts, optional twelve-month additions and item-type reports, save/discard actions, and a link to the saved private preview. Failed saves preserve the draft; expired sessions offer sign-in.
- Gallery keeps the original image grid. Journal uses a narrower reading layout with images alongside stories on desktop and stacked cards on mobile. Both preserve theme, vocabulary, pin order, and recent-item deduplication.
- Cover, summary, pins, and recent additions still follow the overview preferences. Showcase layout/report writes are independent, so they cannot overwrite identity, labels, or overview choices.
- Reports use the existing validated, collection-scoped Insights query and its catalog-mutation invalidation. No Insights request is made when both reports are off. Month links use the API's exact UTC interval with an exclusive upper bound; type links retain type IDs, including the untyped group. The type summary shows the six largest groups and explicitly links to all groups in Insights when needed.
- Reports count the current collection, including unpinned items, and exclude deleted items. Empty reports have guidance. A failed/foreign report response shows a local retry state while the rest of the showcase remains usable. Failed/foreign showcase settings prevent rendering the presentation.
- New authorized GET/PUT `/collections/{collectionId}/showcase-settings` persists choices through the domain and unit of work. Missing/foreign collections return 404; unsupported layouts and omitted report booleans are rejected. The V2 BFF uses the existing session, same-origin mutation, bounded-body, schema-validation, and private/no-store boundary.
- Migration `20261003190840_AddShowcaseSettings` adds three columns, defaulting existing collections to Gallery with reports off. Generated OpenAPI and TypeScript contracts include the new endpoint.

## Validation

- .NET: 339 passing tests (57 domain, 120 application, 132 API, 30 infrastructure); one optional local-media test skipped. All 30 infrastructure tests also passed against disposable PostgreSQL 17, including migration from the previous schema and round-trips of both layouts and report flags.
- V2: 81 unit/component tests passed across the main run and the added report edge-case tests. Production build passed.
- Browser suite: all 52 desktop/mobile cases passed across the full run and focused rerun. The initial two failures were a test reloading before client navigation finished; waiting for the target URL resolved them.
- Coverage includes persistence/reload, restoring defaults, failed-save draft retention, collection switching, reports off without fetching, exact report links, retry, expired access, foreign responses, session/origin/input checks, no-store responses, and all existing workspace flows.
- Desktop/mobile screenshots reviewed for Settings, Journal, and reports using isolated fixtures.

## Local review and next task

Local API is rebuilt with the existing development storage override; its startup applies the additive migration. V2 runs on localhost:3001. Open a collection, then Settings → Shape your showcase. Save choices and open the saved preview.

This completes the layout/report task, not all of Slice 6. Next settle the shareable route and social-preview contract, including slug lifecycle, explicit publish/unpublish, public projection, media access, and cache invalidation. The publication boundary proposed in [the private preview handoff](12-v2-showcase-preview-handoff.md) still applies. No public route, publishing control, or social preview image is implemented here.
