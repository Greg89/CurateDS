using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListItems;

public sealed class ListItemsService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly ILocationRepository _locationRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ITagRepository _tagRepository;

    public ListItemsService(
        ICollectionRepository collectionRepository,
        ILocationRepository locationRepository,
        IItemRepository itemRepository,
        ITagRepository tagRepository)
    {
        _collectionRepository = collectionRepository;
        _locationRepository = locationRepository;
        _itemRepository = itemRepository;
        _tagRepository = tagRepository;
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
        var locations = await _locationRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);
        var tags = await _tagRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);
        var locationLookup = locations.ToDictionary(location => location.Id);
        var tagLookup = tags.ToDictionary(tag => tag.Id);

        return items
            .Select(item => new ItemSummaryDto(
                item.Id,
                item.CollectionId,
                item.Name,
                item.Description,
                item.Quantity,
                item.LocationId,
                item.LocationId.HasValue && locationLookup.TryGetValue(item.LocationId.Value, out var location)
                    ? location.Name
                    : null,
                item.ItemTags
                    .Where(itemTag => tagLookup.ContainsKey(itemTag.TagId))
                    .Select(itemTag => tagLookup[itemTag.TagId].Name)
                    .OrderBy(name => name)
                    .ToArray(),
                item.AttributeValues.Count,
                item.CreatedUtc,
                item.UpdatedUtc))
            .ToArray();
    }
}
