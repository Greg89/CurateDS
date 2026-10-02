# Refactor Review

Status refreshed: 2026-10-02

This folder tracks the incremental refactor originally reviewed in June 2026. The October reconciliation checked the implementation at `c61f0a6`; the original notes had not caught up with merged work. The broader API/web V2 direction is in [the app plan](../app-plan/README.md).

## Where to resume

1. Add relational rollback integration coverage for `EfCatalogUnitOfWork`. Existing API tests use EF InMemory, which cannot prove transactional rollback.
2. Replace the `HttpListener` fake S3 server with a portable test fixture, preserving wire-level upload assertions.
3. Audit remaining drawer/popover interactions and continue decomposing large feature surfaces as needed.

## Implemented

- Shared item-filter serialization, report drill-through, saved-view restoration, and malformed-row handling.
- Item drawers unmount after closing.
- Saved-view JSON shape validation with `invalid_saved_view_filters`, plus application and API tests.
- `ICatalogUnitOfWork` and its EF implementation; item writes and other catalog writes use the abstraction.
- Best-effort object-storage deletion when media metadata persistence fails.
- Tag picker outside-click/Escape handling; the current continuation adds focus on open, close on focus leaving, and reset when disabled. Native checkbox Tab/Space navigation is retained.

## Reading order

1. [Current state](00-current-state-review.md)
2. [Concrete findings](01-concrete-findings.md)
3. [Remaining roadmap](02-prioritized-refactor-roadmap.md)
4. [Validation notes](03-validation-notes.md)
5. [Transaction design and implementation status](04-transaction-boundary-design.md)
