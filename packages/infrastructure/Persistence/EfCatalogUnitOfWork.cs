using CurateDS.Application.Abstractions.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence;

public sealed class EfCatalogUnitOfWork : ICatalogUnitOfWork
{
    private readonly CatalogDbContext _dbContext;

    public EfCatalogUnitOfWork(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task ExecuteInTransactionAsync(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken)
    {
        return ExecuteInTransactionAsync(
            async innerCancellationToken =>
            {
                await operation(innerCancellationToken);
                return true;
            },
            cancellationToken);
    }

    public async Task<T> ExecuteInTransactionAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken)
    {
        if (!_dbContext.Database.IsRelational())
        {
            var result = await operation(cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return result;
        }

        if (_dbContext.Database.CurrentTransaction is not null)
        {
            var result = await operation(cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return result;
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        var transactionalResult = await operation(cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return transactionalResult;
    }
}
