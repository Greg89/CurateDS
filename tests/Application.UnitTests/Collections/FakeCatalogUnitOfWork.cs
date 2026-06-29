using CurateDS.Application.Abstractions.Persistence;

namespace CurateDS.Application.UnitTests.Collections;

internal sealed class FakeCatalogUnitOfWork : ICatalogUnitOfWork
{
    public int ExecutionCount { get; private set; }
    public Exception? ExceptionToThrowAfterOperation { get; init; }

    public async Task ExecuteInTransactionAsync(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken)
    {
        ExecutionCount++;
        await operation(cancellationToken);

        if (ExceptionToThrowAfterOperation is not null)
        {
            throw ExceptionToThrowAfterOperation;
        }
    }

    public async Task<T> ExecuteInTransactionAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken)
    {
        ExecutionCount++;
        var result = await operation(cancellationToken);

        if (ExceptionToThrowAfterOperation is not null)
        {
            throw ExceptionToThrowAfterOperation;
        }

        return result;
    }
}
