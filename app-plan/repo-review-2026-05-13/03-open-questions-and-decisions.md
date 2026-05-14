# Open Questions And Product Decisions

Date: 2026-05-13

These are the questions I would ask before locking the next planning cycle. They are ordered by how much they affect architecture and product direction.

## Product Direction

1. Is CurateDS meant to stay fully hobby-agnostic, or should it launch with a few deeply supported collector verticals?

   Recommendation: keep the core hobby-agnostic, but ship templates and metadata helpers for 3-5 target hobbies. That gives users fast starts without hard-coding the whole product around one niche.

2. Who is the first serious user?

   Examples: casual hobbyist, high-value collector, reseller, archivist, household inventory user, insurance-focused user. The answer changes the priority of valuation, privacy, sharing, bulk import, and mobile capture.

3. Should the first paid/value proposition be private inventory, collection showcase, valuation/insurance, or mobile capture?

   Recommendation: private inventory plus mobile capture first. Valuation and insurance become the second layer once data quality is strong.

4. Are public/shared collections part of the near-term product?

   This affects media privacy, permission model, route design, and whether public read models should be separated from private catalog models.

## Data And Privacy

1. Should media assets be private by default?

   Recommendation: yes. Use signed URLs or authenticated media access for private collections, then add explicit public sharing later.

2. Should deleted items be restorable?

   The backend already has soft delete for core entities, so the product should expose restore/recycle-bin behavior before users trust it with large collections.

3. Should tags and locations remain global per user, or become collection-scoped?

   Current implementation makes tags and locations user-level. That is convenient, but some users may want collection-specific organization. A hybrid model may be best later: global reusable tags with collection usage filters.

4. Should custom attributes be enough for acquisition/value/condition, or should those become first-class models?

   Recommendation: make them first-class. They are cross-hobby collector workflows that need reporting, history, and export semantics.

## Mobile Strategy

1. Is mobile a full management app or a capture/search companion?

   Recommendation: capture/search companion first. Let web carry advanced settings, reports, and bulk operations until mobile workflows prove demand.

2. How important is offline mode?

   For collectors, offline is highly valuable during conventions, stores, warehouses, basements, and garages. The mobile app already has query persistence and an offline banner, so an offline draft queue is a natural next step.

3. Should camera/barcode scanning be central to the add flow?

   Recommendation: yes. Manual entry should remain possible, but camera-first capture is the clearest mobile differentiator.

## Technical Direction

1. Should API clients be generated from OpenAPI?

   Recommendation: move in that direction after endpoint decomposition. In the short term, split API modules and add zod validation to web to match mobile.

2. Should search remain relational or move to a search service?

   Recommendation: stay PostgreSQL first. Add proper indexes and PostgreSQL search capabilities before introducing external search infrastructure.

3. Should automatic database migrations run at API startup in production?

   Current behavior is simple and useful. For production maturity, consider a controlled migration step in deployment so startup failures and schema rollbacks are easier to reason about.

4. Should object storage provisioning happen during upload?

   Recommendation: no long term. Bucket creation and policy should be deployment concerns. Upload should only upload.

5. Should the app adopt a design system now?

   Recommendation: yes, a small internal component system. The UI is about to grow in breadth, and consistent controls will reduce frontend cost.

## My Assumptions In This Review

- The goal is a serious personal collection app, not only a demo CRUD application.
- Web remains the power-user interface.
- Mobile becomes the primary capture interface.
- Auth0 remains the auth provider for the near term.
- PostgreSQL remains the system of record.
- Railway remains the hosting target for beta/production.

