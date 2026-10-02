# Infrastructure integration tests

The default suite runs storage wire tests and SQLite item transaction tests without Docker:

```powershell
dotnet test tests/Infrastructure.IntegrationTests/CurateDS.Infrastructure.IntegrationTests.csproj
```

To exercise the same item transaction cases against PostgreSQL 17 (matching `compose.yaml`):

```powershell
dotnet restore tests/Infrastructure.IntegrationTests/CurateDS.Infrastructure.IntegrationTests.csproj
& ./tests/Infrastructure.IntegrationTests/Test-Postgres.ps1
```

The runner starts an isolated container on a Docker-assigned loopback port, runs the infrastructure suite, then stops/removes that container. It does not use the application database or its volumes. Docker must be running and accessible to the current user.

`CURATEDS_TEST_POSTGRES` selects PostgreSQL for `ItemTransactionTests`. Each case overrides the supplied database name with a generated test database, applies the repository migrations, and drops that database on disposal. An explicitly supplied PostgreSQL account therefore needs permission to create/drop test databases. With the variable unset, the fixture uses isolated SQLite in-memory databases.

Both modes exercise real item create/update/delete services and repositories. A test-only event repository decorator flushes item changes before staging the audit event. Failure cases install a database trigger that rejects the event insert. Fresh contexts verify that the prior write rolls back; success cases verify the item and event commit together. This early flush prevents EF's implicit single-save transaction from hiding a missing application transaction boundary.

PostgreSQL mode covers migrations from an empty database and these transaction scenarios. It does not establish migration safety for every existing production dataset or all provider-specific queries.
