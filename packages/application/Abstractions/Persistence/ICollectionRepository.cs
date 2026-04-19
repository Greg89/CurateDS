using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ICollectionRepository
{
    Task AddAsync(Collection collection, CancellationToken cancellationToken);

    Task<IReadOnlyList<Collection>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken);
}
