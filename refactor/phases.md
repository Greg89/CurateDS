# Refactor Phases

## Phase 1: Correctness And Query-State Reliability

Goal:
Fix state and query behaviors that can make the app appear inconsistent even when the API is correct.

Tasks:

1. Fix item-list cache identity so every active filter participates in the React Query key.
2. Fix report drill-through so `hasNoLocation` and the other generated filters are consumed by the items page.
3. Fix saved-view restoration so `itemTypeId` round-trips with the rest of the item filters.
4. Harden saved-view parsing so one malformed row does not break the whole saved-view query.
Status: Complete

## Phase 2: Reusable Filter Contracts

Goal:
Reduce duplicated filter logic and make list state easier to reason about across pages.

Tasks:

1. Introduce a canonical filter serializer shared by:
   - query keys
   - URL state
   - saved views
   - report drill-through
Status: In Progress
2. Add focused unit tests around filter serialization and application.

## Phase 3: Interaction Hardening

Goal:
Make the higher-traffic client controls more robust for keyboard, focus, and scale.

Tasks:

1. Harden the tag multi-select with click-outside close and Escape handling.
2. Review drawer, popover, and menu focus behavior.
3. Continue splitting large feature surfaces into smaller tested components and hooks.

## Phase 4: Validation And Test Reliability

Goal:
Reduce environment-sensitive failures and improve confidence in local and CI validation.

Tasks:

1. Revisit infrastructure tests that rely on `HttpListener`.
2. Normalize validation expectations for environment-specific test failures.
3. Clean up repo-level build/test notes where needed.
