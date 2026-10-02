# Validation Notes

Status updated: 2026-10-02

## V2 Foundation (2026-10-02)

The first V2 foundation is implemented after completion of the refactor pass. See [the Slice 1 handoff](05-v2-foundation-handoff.md) for setup and verification: 17 V2 unit/component tests, 8 desktop/mobile browser checks, 136 existing web tests, and 100 API integration tests passed. Both web builds, the V2 Docker build/runtime smoke, and npm audit passed. Live Auth0 configuration remains an explicit acceptance step before Slice 2.

## Portable Storage Fixture (2026-10-02)

- Replaced the `HttpListener` fake with `FakeS3Server`, an in-process Kestrel host bound directly to an ephemeral loopback port. Request capture and server shutdown are awaited, snapshots are thread-safe, and handler failures are surfaced on disposal.
- Existing HTTP upload/body/header/path and S3 deletion-error assertions remain. Added concurrent uploads to independent endpoints to verify port and request isolation.
- Renamed the HTTPS test to describe its actual transport-failure assertion. It does not prove `UNSIGNED-PAYLOAD`; a trusted live TLS fixture remains a recorded follow-up.
- Windows: `dotnet test tests/Infrastructure.IntegrationTests/CurateDS.Infrastructure.IntegrationTests.csproj --no-restore --verbosity minimal`: 18 passed.
- Linux: ran the infrastructure project in disposable `mcr.microsoft.com/dotnet/sdk:10.0`, copying source from a read-only workspace mount and excluding host `bin`/`obj`. NuGet restore, build, and all 18 tests passed. The container used SQLite for transaction cases and was removed on exit.
- Linux image digest: `sha256:35d40304542c8689331f8cab17c65926cdf48fe711e289321d71924b230a7d29`.
- PostgreSQL coverage from the preceding continuation remains valid; this slice changed only storage tests and documentation. No product source was changed.
- `git diff --check`: passed. The first refactor pass is complete; next is V2 Slice 1, with remaining follow-ups retained in the roadmap.

## PostgreSQL Docker Validation (2026-10-02)

- After Docker startup, ran `tests/Infrastructure.IntegrationTests/Test-Postgres.ps1`: all 17 infrastructure tests passed, including the 6 item commit/rollback scenarios against PostgreSQL 17.
- Each PostgreSQL case used a generated database and applied the repository migrations before seeding. Trigger failures verified rollback after the item write had been flushed.
- The isolated container used the same `postgres:17-alpine` image as Compose, an ephemeral loopback port, and no application volumes. Cleanup completed; a Docker container listing confirmed no matching test container remained.
- Reran the 6 item transaction cases in default SQLite mode after the fixture change: all passed.
- The reusable runner and provider selection are documented in `tests/Infrastructure.IntegrationTests/README.md`.
- This closes the earlier production-provider gap for these transaction cases and clean-database migration startup. It does not validate migrations against every existing dataset or all PostgreSQL-specific queries.

## Transaction Coverage Continuation (2026-10-02)

- Added `tests/Infrastructure.IntegrationTests/ItemTransactionTests.cs`: six SQLite integration cases for create/update/delete commit and rollback, using real services and repositories.
- Failure injection flushes item changes before a SQLite trigger rejects the audit-event insert. Assertions use a fresh context and include soft-deleted rows.
- `dotnet test tests/Infrastructure.IntegrationTests/CurateDS.Infrastructure.IntegrationTests.csproj --no-restore --filter FullyQualifiedName~ItemTransactionTests --verbosity minimal`: 6 passed.
- Mutation check: temporarily bypassing the relational transaction made all 3 rollback cases fail on partially persisted item state; all 3 success cases still passed. Production code was restored byte-for-byte afterward.
- `dotnet test tests/Infrastructure.IntegrationTests/CurateDS.Infrastructure.IntegrationTests.csproj --no-restore --verbosity minimal`: 17 passed after restoring production code, including existing storage tests.
- NuGet restore passed after pinning `SQLitePCLRaw.bundle_e_sqlite3` 3.0.3 in the test project. The default 2.1.11 native dependency was rejected by the existing vulnerability-as-error policy ([advisory](https://github.com/advisories/GHSA-2m69-gcr7-jv3q)); the newer bundle uses the maintainer's replacement native package.
- Docker was unavailable. SQLite verifies relational transaction ownership and rollback, not PostgreSQL-specific SQL, migrations, or production isolation behavior.
- Full solution and web checks were not rerun for this test-only slice. Storage portability remains planned despite the existing tests passing on this host.

## Tag Picker Continuation (2026-10-02)

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
