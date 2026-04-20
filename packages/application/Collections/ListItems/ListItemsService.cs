using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListItems;

public sealed class ListItemsService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;

    public ListItemsService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
    }

    public async Task<IReadOnlyList<ItemSummaryDto>> ExecuteAsync(
        ListItemsQuery query,
        CancellationToken cancellationToken)
    {
        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            query.CollectionId,
            query.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        var items = await _itemRepository.ListByCollectionAsync(query.CollectionId, cancellationToken);

        return items
            .Select(item => new ItemSummaryDto(
                item.Id,
                item.CollectionId,
                item.Name,
                item.Description,
                item.Quantity,
                item.AttributeValues.Count,
                item.CreatedUtc,
                item.UpdatedUtc))
            .ToArray();
    }
}
