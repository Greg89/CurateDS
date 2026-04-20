using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface IItemRepository
{
    Task AddAsync(Item item, CancellationToken cancellationToken);

    Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken);
}
