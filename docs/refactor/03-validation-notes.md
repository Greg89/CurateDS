# Validation Notes

Status updated: 2026-10-03

## V2 Insights (2026-10-03)

Slice 4 is complete. The full .NET solution passed 308 tests (one opt-in media test skipped); all 26 infrastructure cases also passed against isolated PostgreSQL 17. V2 passed 56 unit/component tests, its production build, and all 24 desktop/mobile browser cases. Screenshots were reviewed. The legacy web build and 137 tests passed; one reports-page timing failure in the initial concurrent run passed in the full rerun. New checks cover exact typed-value drill-through, UTC date boundaries, owner isolation, bounded aggregation, deleted-item activity, and saved-view compatibility. No migration was needed. See [the Slice 4 handoff](08-v2-insights-handoff.md).

## V2 Browse And Curate (2026-10-02)

Slice 3 is complete. All 300 existing .NET tests passed, plus the new opt-in real-storage API acceptance test. V2 passed 44 unit/component tests and its production build. All 20 desktop/mobile browser cases passed across the complete run and focused browse rerun; the latter fixed asynchronous filter loading and test selectors. Screenshots were reviewed. Optional local media storage was built, started, and verified through real upload/read/primary/edit/delete operations with isolated test data. See [the Slice 3 handoff](07-v2-browse-curate-handoff.md).

## V2 Collection Creation And Overview (2026-10-02)

Slice 2 is implemented. The full .NET solution passed 300 tests; the disposable PostgreSQL run passed all 19 infrastructure tests with the new additive identity migration. V2 passed 25 unit/component tests and its production build. The 14 existing browser cases passed, followed by both new desktop/mobile creation cases after correcting a test selector. New coverage checks save-error recovery, collection identity persistence, first-item creation, reload, owner isolation, and complete workspace switching. Screenshots were reviewed for desktop/mobile layout and overflow. Existing web build and all 136 tests passed. The local Docker API was rebuilt/restarted, and its health endpoint returned 200. See [the Slice 2 handoff](06-v2-collection-overview-handoff.md) for scope and next steps.

## V2 Foundation (2026-10-02)

The first V2 foundation is complete after completion of the refactor pass. See [the Slice 1 handoff](05-v2-foundation-handoff.md) for setup and verification: 17 V2 unit/component tests, 14 desktop/mobile browser checks, 136 existing web tests, and 100 API integration tests passed. Both web builds, the V2 Docker build/runtime smoke, and npm audit passed. The browser suite verifies refresh-token rotation/persistence, refresh failure, and logout access removal against a local identity-provider fixture. After updating Auth0 configuration, the user ran the interactive live checker and provided passing terminal results for login/callback, authenticated collection access, two token refreshes with persisted session cookies, logout/session removal/protected-route denial, and sign-in/API access after logout. The isolated test session was signed out on completion. Slice 1 live acceptance is complete; Slice 2 is next.

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
