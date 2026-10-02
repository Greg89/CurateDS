# Validation Notes

Status updated: 2026-10-02

## Current Continuation (2026-10-02)

- `npm run test:web -- src/catalog/tag-multi-select.test.tsx`: the three new regression tests failed before the component change; all six passed after it.
- `npm run test:web -- src/catalog/tag-multi-select.test.tsx src/catalog/catalog-ui.test.tsx src/catalog/dialog-surface.test.tsx`: 29 tests passed across three files.
- `npm run build:web`: passed; Vite reported a bundle larger than 500 kB.
- `dotnet test tests/Application.UnitTests/CurateDS.Application.UnitTests.csproj --no-restore --filter "FullyQualifiedName~CreateSavedView|FullyQualifiedName~CreateItemService|FullyQualifiedName~UpdateItemService|FullyQualifiedName~DeleteItemService|FullyQualifiedName~UploadItemMedia" --verbosity minimal`: 48 tests passed using SDK 10.0.203.
- No API, infrastructure, full-solution, Docker, or browser smoke run was performed in this continuation. Relational rollback remains unverified.

## Historical Validation (2026-06-29)

The results below belong to the earlier environment and are not fresh validation of this checkout.

## What Was Checked

- repository structure and current app surface
- web shell, items workflow, reports flow, saved views, and item filter handling
- API startup and item query path
- local Docker stack startup
- beta smoke test result for the item drawer fix

## Command Results In This Environment

### Passed

- `npm run build:web`
- `npm run test:web -- src/catalog/catalog-ui.test.tsx`
- `npm run test:web -- src/catalog/items-workspace-state.test.tsx src/catalog/entity-management-table.test.tsx src/catalog/settings-sections.test.tsx`
- `docker compose up --build -d`
- `GET http://localhost:8080/health` returned `Healthy`
- `GET http://localhost:3000` returned `200`

### Product Smoke Test

- Beta smoke testing after the item drawer unmount fix passed.
- The Settings tab no longer triggers a stuck Create Item popup.

### Partially Passed

- `dotnet test CurateDS.sln --no-build`
  - domain tests passed
  - application tests passed
  - API integration tests passed
  - infrastructure integration tests failed in MinIO fake-server tests due `HttpListener` host issues in this environment

### Blocked By Environment

- `dotnet build CurateDS.sln`
  - failed because the current environment could not read the user-level NuGet config at:
    - `C:\Users\dodso\AppData\Roaming\NuGet\NuGet.Config`

## Interpretation

The review findings above are based on:

- direct code inspection
- current product behavior implied by the existing state-management and routing paths
- validation signals that the web app currently builds cleanly
- local Docker startup signals

The infrastructure test failures and .NET build issue should be treated as environment-validation concerns, not proof that the core app is broadly broken.
