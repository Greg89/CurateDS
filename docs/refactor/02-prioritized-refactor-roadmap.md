# Prioritized Refactor Roadmap

Status updated: 2026-06-29

## Phase 1: Documentation And Status Refresh

Goal:
Make the refactor notes match the repo before planning more work.

Work:

1. Mark completed filter, saved-view, and report drill-through fixes as done.
2. Record the item drawer unmount fix and green beta smoke test.
3. Keep the remaining open work visible: encoding cleanup, `TagMultiSelect`, saved-view write validation, and transaction-boundary design.

## Phase 2: Polish And Encoding Cleanup

Goal:
Clean obvious presentation debt while refactor momentum is already active.

Work:

1. Fix mojibake and content-encoding regressions.
2. Review top-level docs for outdated statements.
3. Consider a small contributor-facing quality checklist for:
   - encoding
   - accessibility
   - filter/query symmetry

## Phase 3: UI Hardening

Goal:
Stabilize newer interactive controls and keep the shell maintainable.

Work:

1. Harden `TagMultiSelect` behavior.
2. Audit other drawer and popover interactions for consistent close/focus behavior.
3. Continue decomposing feature surfaces like the items workspace into smaller tested units.

## Phase 4: Saved-View Write Validation

Goal:
Prevent invalid saved-view filter payloads from entering persistence.

Work:

1. Validate `FiltersJson` in `CreateSavedViewCommandValidator` or `CreateSavedViewService`.
2. Reuse the same supported item-filter shape as the web client.
3. Add application and API integration tests for malformed JSON and unsupported shapes.

## Phase 5: Transaction-Boundary Design

Goal:
Define the write consistency approach before adding more multi-table domain features.

Work:

1. Decide whether application services should depend on a unit-of-work abstraction or infrastructure transaction service.
2. Start with item create, update, and delete flows.
3. Define compensation behavior separately for object storage plus database writes.

## Phase 6: Validation Reliability

Goal:
Reduce environment-specific failures in local and CI feedback loops.

Work:

1. Revisit infrastructure tests that depend on `HttpListener`.
2. Decide whether to:
   - swap to a more portable fake server
   - isolate those tests behind explicit environment assumptions
   - move them to a different integration-test style
3. Make repo validation notes clearer when failures are environment-specific rather than product regressions.
