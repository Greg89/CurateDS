# Refactor Review

Status refreshed: 2026-10-03

This folder tracks the incremental refactor originally reviewed in June 2026. The October reconciliation checked the implementation at `c61f0a6`; the original notes had not caught up with merged work. The next product phase follows the [V2 roadmap](../15-v2-roadmap.md), with supporting engineering guidance in [the app plan](../app-plan/README.md).

## Where to resume

1. Relational rollback coverage is complete for item create/update/delete using SQLite and PostgreSQL 17 with real services/repositories. PostgreSQL mode applies repository migrations to fresh databases; see the [test runner](../../tests/Infrastructure.IntegrationTests/README.md).
2. Storage-test portability is complete: Kestrel binds an ephemeral loopback port directly, captures requests asynchronously, and awaits shutdown. Wire-level assertions and concurrent-server isolation are covered.
3. V2 Slices 1–4 are complete in `apps/web-v2`. Live Auth0 acceptance is recorded in [the foundation handoff](05-v2-foundation-handoff.md); collection creation, identity, overview data, and first-item entry are covered in [the Slice 2 handoff](06-v2-collection-overview-handoff.md). Browse, full item editing, and media management are covered in [the Slice 3 handoff](07-v2-browse-curate-handoff.md). Insights, exact report drill-through, activity, and saved views are covered in [the Slice 4 handoff](08-v2-insights-handoff.md). Slice 5 identity editing is covered in [the Settings handoff](09-v2-collection-settings-handoff.md). Continue Slice 5 with featured/pinned items and configurable overview sections. Remaining interaction audits and feature decomposition are recorded follow-ups.

## After the first refactor pass

The first refactor pass and V2 Slices 1–4 are complete. Continue with [V2 Slice 5: Collection Customization](../15-v2-roadmap.md#slice-5-collection-customization); transaction and storage-test validation are complete, and remaining follow-ups are recorded in the refactor roadmap. Avoid letting optional legacy UI decomposition indefinitely delay V2.

Slice 0 is already complete, with decisions accepted on 2026-09-20: start a temporary `apps/web-v2` Next.js App Router application, preserve the current web as a behavioral reference, and keep the .NET API authoritative. Carry the refactor's tested behavior into V2. Track broader trust/scale work under V2 Slice 7 without repeating transaction implementation already completed here.

## Implemented

- Shared item-filter serialization, report drill-through, saved-view restoration, and malformed-row handling.
- Item drawers unmount after closing.
- Saved-view JSON shape validation with `invalid_saved_view_filters`, plus application and API tests.
- `ICatalogUnitOfWork` and its EF implementation; item writes and other catalog writes use the abstraction. Six integration cases, verified on both SQLite and PostgreSQL, cover successful commits and rollback after audit-event persistence failure.
- Best-effort object-storage deletion when media metadata persistence fails.
- Tag picker outside-click/Escape handling; the current continuation adds focus on open, close on focus leaving, and reset when disabled. Native checkbox Tab/Space navigation is retained.

## Reading order

1. [Current state](00-current-state-review.md)
2. [Concrete findings](01-concrete-findings.md)
3. [Remaining roadmap](02-prioritized-refactor-roadmap.md)
4. [Validation notes](03-validation-notes.md)
5. [Transaction design and implementation status](04-transaction-boundary-design.md)
6. [V2 foundation handoff](05-v2-foundation-handoff.md)
