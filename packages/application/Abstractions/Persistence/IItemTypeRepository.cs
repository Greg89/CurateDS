using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface IItemTypeRepository
{
    Task AddAsync(ItemType itemType, CancellationToken cancellationToken);

    Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken);

    Task<ItemType?> GetByIdAndCollectionAsync(Guid itemTypeId, Guid collectionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<ItemType>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(Guid itemTypeId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);
}
