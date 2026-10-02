# Refactor Review

Status refreshed: 2026-10-02

This folder tracks the incremental refactor originally reviewed in June 2026. The October reconciliation checked the implementation at `c61f0a6`; the original notes had not caught up with merged work. The next product phase follows the [V2 roadmap](../15-v2-roadmap.md), with supporting engineering guidance in [the app plan](../app-plan/README.md).

## Where to resume

1. Relational rollback coverage is complete for item create/update/delete using SQLite and PostgreSQL 17 with real services/repositories. PostgreSQL mode applies repository migrations to fresh databases; see the [test runner](../../tests/Infrastructure.IntegrationTests/README.md).
2. Replace the `HttpListener` fake S3 server with a portable test fixture, preserving wire-level upload assertions.
3. Audit remaining drawer/popover interactions and continue decomposing large feature surfaces as needed.

## After the first refactor pass

Move to [V2 Slice 1: Next.js Web Foundation](../15-v2-roadmap.md#slice-1-nextjs-web-foundation) after the transaction and storage-test validation work above is complete and remaining follow-ups are recorded. Avoid letting optional legacy UI decomposition indefinitely delay V2.

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
