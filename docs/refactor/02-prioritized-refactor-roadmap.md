# Prioritized Refactor Roadmap

## Phase 1: Correctness Fixes

Goal:
Remove behavior mismatches before adding more features.

Work:

1. Fix item-list query keys so every active filter participates in cache identity.
2. Fix report drill-through so every generated filter is consumed by the items page.
3. Fix saved view restoration so `itemTypeId` is restored with the rest of the filters.
4. Add tests for:
   - quantity/date/quick filter refetch behavior
   - saved view round-trip fidelity
   - report drill-through into filtered items

## Phase 2: Client State Consolidation

Goal:
Reduce repeated filter-state logic and make future browsing work safer.

Work:

1. Introduce a canonical item-filter serializer.
2. Reuse it for:
   - React Query keys
   - URL state
   - saved view persistence
   - report drill-through
3. Move fragile parsing helpers behind typed utilities with fallback behavior.

## Phase 3: UI Hardening

Goal:
Stabilize newer interactive controls and keep the shell maintainable.

Work:

1. Harden `TagMultiSelect` behavior.
2. Audit other drawer and popover interactions for consistent close/focus behavior.
3. Continue decomposing feature surfaces like the items workspace into smaller tested units.

## Phase 4: Validation Reliability

Goal:
Reduce environment-specific failures in local and CI feedback loops.

Work:

1. Revisit infrastructure tests that depend on `HttpListener`.
2. Decide whether to:
   - swap to a more portable fake server
   - isolate those tests behind explicit environment assumptions
   - move them to a different integration-test style
3. Make repo validation notes clearer when failures are environment-specific rather than product regressions.

## Phase 5: Polish And Maintenance

Goal:
Clean obvious presentation debt while refactor momentum is already active.

Work:

1. Fix mojibake and content-encoding regressions.
2. Review top-level docs for outdated statements.
3. Consider a small contributor-facing quality checklist for:
   - encoding
   - accessibility
   - filter/query symmetry
