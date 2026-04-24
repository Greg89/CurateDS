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
        var normalizedSearchText = query.SearchText?.Trim();

        return items
            .Where(item => MatchesLocationFilter(item, query.LocationId))
            .Where(item => MatchesTagFilter(item, query.TagIds))
            .Where(item => MatchesSearchText(item, normalizedSearchText, locationLookup, tagLookup))
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

    private static bool MatchesLocationFilter(Domain.Collections.Item item, Guid? locationId)
    {
        return !locationId.HasValue || item.LocationId == locationId.Value;
    }

    private static bool MatchesTagFilter(Domain.Collections.Item item, IReadOnlyList<Guid> tagIds)
    {
        if (tagIds.Count == 0)
        {
            return true;
        }

        var itemTagIds = item.ItemTags.Select(itemTag => itemTag.TagId).ToHashSet();
        return tagIds.All(itemTagIds.Contains);
    }

    private static bool MatchesSearchText(
        Domain.Collections.Item item,
        string? searchText,
        IReadOnlyDictionary<Guid, Domain.Collections.Location> locationLookup,
        IReadOnlyDictionary<Guid, Domain.Collections.Tag> tagLookup)
    {
        if (string.IsNullOrWhiteSpace(searchText))
        {
            return true;
        }

        return EnumerateSearchValues(item, locationLookup, tagLookup)
            .Any(value => value.Contains(searchText, StringComparison.OrdinalIgnoreCase));
    }

    private static IEnumerable<string> EnumerateSearchValues(
        Domain.Collections.Item item,
        IReadOnlyDictionary<Guid, Domain.Collections.Location> locationLookup,
        IReadOnlyDictionary<Guid, Domain.Collections.Tag> tagLookup)
    {
        yield return item.Name;

        if (!string.IsNullOrWhiteSpace(item.Description))
        {
            yield return item.Description;
        }

        if (item.LocationId.HasValue && locationLookup.TryGetValue(item.LocationId.Value, out var location))
        {
            yield return location.Name;

            if (!string.IsNullOrWhiteSpace(location.Description))
            {
                yield return location.Description;
            }
        }

        foreach (var itemTag in item.ItemTags)
        {
            if (tagLookup.TryGetValue(itemTag.TagId, out var tag))
            {
                yield return tag.Name;
            }
        }

        foreach (var attributeValue in item.AttributeValues)
        {
            if (!string.IsNullOrWhiteSpace(attributeValue.ValueText))
            {
                yield return attributeValue.ValueText;
            }

            if (attributeValue.ValueNumber.HasValue)
            {
                yield return attributeValue.ValueNumber.Value.ToString();
            }

            if (attributeValue.ValueDecimal.HasValue)
            {
                yield return attributeValue.ValueDecimal.Value.ToString("0.##");
            }

            if (attributeValue.ValueBoolean.HasValue)
            {
                yield return attributeValue.ValueBoolean.Value.ToString();
            }

            if (attributeValue.ValueDate.HasValue)
            {
                yield return attributeValue.ValueDate.Value.ToString("yyyy-MM-dd");
            }
        }
    }
}
