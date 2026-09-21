# V2 Refactor Phases

## Phase 0: Repo Noise Trim

Goal:
Reduce the repository to the surfaces V2 is actually carrying forward: API, web, shared backend packages, and their tests.

Tasks:

1. Remove inactive client surfaces and planning docs.
2. Remove inactive coverage, dependency-update, static-analysis, and extra-client CI wiring.
3. Keep CI focused on backend and frontend checks.
4. Update root scripts and docs to match the API + web baseline.

Status: In Progress

## Phase 1: V2 Product Foundation

Goal:
Define the experience CurateDS V2 is actually trying to become before moving screens around.

Tasks:

1. Name the first serious user and primary collection workflow.
2. Decide whether the V2 shell starts inside the existing web app or a temporary parallel web surface.
3. Lock the design-system seed: buttons, fields, drawers, modals, tables, empty states, and icons.
4. Define the API contract strategy for the web client.

## Phase 2: Web Experience Rebuild

Goal:
Rework the browser experience around collection workflows instead of old MVP page seams.

Tasks:

1. Rebuild the collection workspace shell.
2. Rebuild item browsing and filtering around dense, repeat-use workflows.
3. Rebuild item detail, create, edit, and media flows with shared primitives.
4. Keep route-by-route validation and focused tests green.

## Phase 3: Backend Contract Hardening

Goal:
Keep the existing backend strengths while tightening the parts the new web experience depends on.

Tasks:

1. Review request and response DTOs for V2 workflows.
2. Add or generate stronger TypeScript contract coverage.
3. Finish transaction boundaries for multi-step writes.
4. Decide media privacy and cleanup behavior before valuation or insurance features.

## Phase 4: Scale And Import Readiness

Goal:
Make larger real collections practical before adding bulk workflows.

Tasks:

1. Refactor export to stream or page collection items.
2. Add cursor pagination or virtualization where needed.
3. Prepare CSV import with preview and dry-run validation.
4. Add focused query-shape tests for expensive list paths.
