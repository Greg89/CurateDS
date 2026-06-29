# Transaction Boundary Design

Status created: 2026-06-29

## Decision

Add an application-layer transaction abstraction and implement it in infrastructure with EF Core.

Application services should depend on a small persistence abstraction, not on `CatalogDbContext` or EF transaction APIs directly. This keeps transaction ownership visible in use-case code while preserving the current application/infrastructure boundary.

Recommended shape:

```csharp
public interface ICatalogUnitOfWork
{
    Task ExecuteInTransactionAsync(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken);
}
```

The infrastructure implementation should:

1. Use the scoped `CatalogDbContext`.
2. If `Database.IsRelational()` is true, open `BeginTransactionAsync`, run the operation, call `SaveChangesAsync`, then commit.
3. If the provider is non-relational, run the operation and call `SaveChangesAsync` without opening a relational transaction.

That fallback keeps existing in-memory tests practical while still giving PostgreSQL the real transaction boundary.

## First Implementation Slice

Start with database-only item write flows:

- `CreateItemService`
- `UpdateItemService`
- `DeleteItemService`

These flows currently write item state and item events in separate persistence calls. If the item event write fails after the item state changes, the database can record an item without its audit event or vice versa.

Target behavior:

1. Validate input and load reference data before opening the transaction where practical.
2. Open the transaction only around writes.
3. Stage item state changes and item event changes.
4. Commit once.

## Repository Cleanup Required

Several repository methods currently call `SaveChangesAsync` internally:

- `AddAsync(...)` on collection, item, item type, tag, location, and attribute definition repositories
- `SoftDeleteAsync(...)` on collection, item, item type, tag, location, and attribute definition repositories
- `SoftDeleteByCollectionAsync(...)` on item repository

That makes transaction ownership ambiguous. The first transaction implementation can still work for some flows, but the long-term rule should be:

- repositories stage changes
- application services coordinate use cases
- unit of work commits

Do not convert every repository at once. Convert each method as part of the service transaction slice that needs it, with focused tests.

## Media And Object Storage

Do not treat object storage as part of the EF transaction. `UploadItemMediaService` uploads to storage before writing database metadata, so a database failure can orphan an uploaded object.

Handle media separately with one of these follow-up approaches:

1. Upload first, then delete the object as compensation if the database write fails.
2. Write a pending media row first, upload, then mark complete.
3. Add an orphan-media cleanup job.

The first option is the smallest near-term improvement. The cleanup job is still useful for defensive repair.

## Testing Plan

Application unit tests should use a fake unit of work that records whether the operation was executed.

Integration tests should cover at least one rollback case against a relational provider or a transaction-capable test setup:

- arrange an item write where item event persistence fails
- assert item state is not partially persisted

If the current API integration setup uses EF in-memory for speed, add the rollback assertion once a relational integration test fixture is available.

## Open Questions

1. Should `ICatalogUnitOfWork` expose `SaveChangesAsync` separately, or should `ExecuteInTransactionAsync` always commit?
2. Should read operations ever use explicit transactions for consistency, or only write use cases?
3. Should repository `SaveChangesAsync` methods be removed once services fully own commits?

Recommendation: keep the first abstraction minimal and only support transactional write execution. Revisit the shape after the item write flows are converted.
