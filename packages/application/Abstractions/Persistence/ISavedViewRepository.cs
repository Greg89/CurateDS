using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ISavedViewRepository
{
    Task AddAsync(SavedView savedView, CancellationToken cancellationToken);

    Task<IReadOnlyList<SavedView>> ListByCollectionAsync(Guid collectionId, string ownerId, CancellationToken cancellationToken);

    Task<SavedView?> GetByIdAsync(Guid id, string ownerId, CancellationToken cancellationToken);

    void Remove(SavedView savedView);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
