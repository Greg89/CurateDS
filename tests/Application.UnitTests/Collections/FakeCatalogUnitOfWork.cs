using CurateDS.Application.Abstractions.Persistence;

namespace CurateDS.Application.UnitTests.Collections;

internal sealed class FakeCatalogUnitOfWork : ICatalogUnitOfWork
{
    public int ExecutionCount { get; private set; }

    public Task ExecuteInTransactionAsync(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken)
    {
        ExecutionCount++;
        return operation(cancellationToken);
    }

    public async Task<T> ExecuteInTransactionAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken)
    {
        ExecutionCount++;
        return await operation(cancellationToken);
    }
}
