using CurateDS.Application.Collections;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface IItemRepository
{
    Task AddAsync(Item item, CancellationToken cancellationToken);

    Task ReplaceAttributeValuesAsync(
        Guid itemId,
        IReadOnlyList<ItemAttributeValue> attributeValues,
        CancellationToken cancellationToken);

    Task ReplaceTagsAsync(
        Guid itemId,
        IReadOnlyList<ItemTag> itemTags,
        CancellationToken cancellationToken);

    Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken);

    Task<PagedResult<ItemSummaryDto>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);

    void AddMediaAsset(MediaAsset asset);

    Task<bool> SoftDeleteAsync(Guid itemId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);

    Task SoftDeleteByCollectionAsync(Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);
}
