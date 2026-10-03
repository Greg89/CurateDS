using CurateDS.Application.Collections.CollectionPresentation;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ICollectionPresentationRepository
{
    Task<IReadOnlyList<PinnedItemProjection>> GetItemsAsync(Guid collectionId, IReadOnlyList<Guid> ids,
        CancellationToken cancellationToken);
}
