using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListItemEvents;

public sealed class ListItemEventsService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IItemEventRepository _itemEventRepository;

    public ListItemEventsService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        IItemEventRepository itemEventRepository)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _itemEventRepository = itemEventRepository;
    }

    public async Task<IReadOnlyList<ItemEventDto>> ExecuteAsync(
        ListItemEventsQuery query,
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

        var item = await _itemRepository.GetByIdAsync(query.ItemId, query.CollectionId, cancellationToken);

        if (item is null)
        {
            throw new NotFoundException("Item was not found.");
        }

        var events = await _itemEventRepository.ListByItemAsync(query.ItemId, query.CollectionId, cancellationToken);

        return events
            .OrderByDescending(e => e.OccurredUtc)
            .Select(e => new ItemEventDto(
                e.Id,
                e.ItemId,
                e.CollectionId,
                e.EventType,
                e.OccurredUtc,
                e.OccurredBy,
                e.Notes))
            .ToArray();
    }
}
