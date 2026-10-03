# Infrastructure integration tests

The default suite runs storage wire tests and SQLite item transaction/Insights/presentation tests without Docker:

```powershell
dotnet test tests/Infrastructure.IntegrationTests/CurateDS.Infrastructure.IntegrationTests.csproj
```

To exercise the same item transaction, Insights, and presentation cases against PostgreSQL 17 (matching `compose.yaml`):

```powershell
dotnet restore tests/Infrastructure.IntegrationTests/CurateDS.Infrastructure.IntegrationTests.csproj
& ./tests/Infrastructure.IntegrationTests/Test-Postgres.ps1
```

The runner starts an isolated container on a Docker-assigned loopback port, runs the infrastructure suite, then stops/removes that container. It does not use the application database or its volumes. Docker must be running and accessible to the current user.

`CURATEDS_TEST_POSTGRES` selects PostgreSQL for `ItemTransactionTests` , `CollectionInsightsTests`, and `CollectionPresentationTests`. Each case overrides the supplied database name with a generated test database, applies the repository migrations, and drops that database on disposal. An explicitly supplied PostgreSQL account therefore needs permission to create/drop test databases. With the variable unset, the fixture uses isolated SQLite in-memory databases.

Both modes exercise real item create/update/delete services and repositories. A test-only event repository decorator flushes item changes before staging the audit event. Failure cases install a database trigger that rejects the event insert. Fresh contexts verify that the prior write rolls back; success cases verify the item and event commit together. This early flush prevents EF's implicit single-save transaction from hiding a missing application transaction boundary.

Insights cases verify SQL aggregation and exact typed-value drill-through, decimal precision, UTC month boundaries, owner isolation, soft deletion, empty/high-cardinality results, and activity pagination including deleted items. Presentation coverage verifies persisted section flags and ordered pins, including primary media, foreign/deleted items, and clearing pins. Its PostgreSQL path also inserts a collection under the previous schema before applying the presentation migration, checking preservation of the default layout. PostgreSQL mode covers migrations from an empty database, that specific upgrade, these queries, and the transaction scenarios. It does not establish migration safety for every existing production dataset or all provider-specific queries.

Storage tests use an in-process Kestrel endpoint bound directly to `127.0.0.1:0`, so they do not require HTTP.sys URL registration or a probe-then-bind port reservation. The fixture captures complete request bodies asynchronously and awaits shutdown; handler failures are surfaced during disposal. Concurrent uploads to two fixtures verify endpoint isolation. HTTP signing is checked on the wire; the HTTPS connection-failure smoke test does not verify the actual `UNSIGNED-PAYLOAD` header.
