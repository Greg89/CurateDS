namespace CurateDS.Application.Abstractions.Persistence;

public interface ICatalogUnitOfWork
{
    Task SuspendPublicationAsync(Guid collectionId, string reason, CancellationToken cancellationToken);
    Task ExecuteInTransactionAsync(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken);

    Task<T> ExecuteInTransactionAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken);
}
