using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ISavedViewRepository
{
    Task AddAsync(SavedView savedView, CancellationToken cancellationToken);

    Task<IReadOnlyList<SavedView>> ListByCollectionAsync(Guid collectionId, Guid ownerId, CancellationToken cancellationToken);

    Task<SavedView?> GetByIdAsync(Guid id, Guid ownerId, CancellationToken cancellationToken);

    void Remove(SavedView savedView);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
