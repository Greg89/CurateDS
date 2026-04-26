using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListItems;

public sealed class ListItemsService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;

    public ListItemsService(ICollectionRepository collectionRepository, IItemRepository itemRepository)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
    }

    public async Task<PagedResult<ItemSummaryDto>> ExecuteAsync(
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

        return await _itemRepository.QueryAsync(query, cancellationToken);
    }
}
