using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListItems;

public sealed class ListItemsService
{
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly ICollectionRepository _collectionRepository;
    private readonly ILocationRepository _locationRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ITagRepository _tagRepository;

    public ListItemsService(
        IAttributeDefinitionRepository attributeDefinitionRepository,
        ICollectionRepository collectionRepository,
        ILocationRepository locationRepository,
        IItemRepository itemRepository,
        ITagRepository tagRepository)
    {
        _attributeDefinitionRepository = attributeDefinitionRepository;
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
        var attributeDefinitions = await _attributeDefinitionRepository.ListByCollectionAsync(
            query.CollectionId,
            cancellationToken);
        var locations = await _locationRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);
        var tags = await _tagRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);
        var attributeDefinitionLookup = attributeDefinitions.ToDictionary(definition => definition.Id);
        var filterableAttributeLookup = attributeDefinitions
            .Where(definition => definition.IsFilterable)
            .ToDictionary(definition => definition.Key, StringComparer.OrdinalIgnoreCase);
        var locationLookup = locations.ToDictionary(location => location.Id);
        var tagLookup = tags.ToDictionary(tag => tag.Id);
        var normalizedSearchText = query.SearchText?.Trim();
        var normalizedAttributeFilters = query.AttributeFilters
            .Where(filter => !string.IsNullOrWhiteSpace(filter.AttributeKey) && !string.IsNullOrWhiteSpace(filter.Value))
            .Select(filter => new ListItemsAttributeFilter(filter.AttributeKey.Trim(), filter.Value.Trim()))
            .ToArray();

        return items
            .Where(item => MatchesLocationFilter(item, query.LocationId))
            .Where(item => MatchesTagFilter(item, query.TagIds))
            .Where(item => MatchesAttributeFilters(item, normalizedAttributeFilters, filterableAttributeLookup))
            .Where(item => MatchesSearchText(item, normalizedSearchText, locationLookup, tagLookup, attributeDefinitionLookup))
            .OrderBy(item => item, CreateComparer(query.SortBy, query.SortDirection))
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

    private static IComparer<Domain.Collections.Item> CreateComparer(string? sortBy, string? sortDirection)
    {
        var descending = !string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);

        return sortBy?.Trim().ToLowerInvariant() switch
        {
            "name" => descending
                ? Comparer<Domain.Collections.Item>.Create((left, right) =>
                    CompareStrings(right.Name, left.Name, right.CreatedUtc, left.CreatedUtc))
                : Comparer<Domain.Collections.Item>.Create((left, right) =>
                    CompareStrings(left.Name, right.Name, left.CreatedUtc, right.CreatedUtc)),
            "quantity" => descending
                ? Comparer<Domain.Collections.Item>.Create((left, right) =>
                    CompareNumbers(right.Quantity, left.Quantity, right.CreatedUtc, left.CreatedUtc))
                : Comparer<Domain.Collections.Item>.Create((left, right) =>
                    CompareNumbers(left.Quantity, right.Quantity, left.CreatedUtc, right.CreatedUtc)),
            "createdutc" or "created" => descending
                ? Comparer<Domain.Collections.Item>.Create((left, right) => CompareDates(right.CreatedUtc, left.CreatedUtc))
                : Comparer<Domain.Collections.Item>.Create((left, right) => CompareDates(left.CreatedUtc, right.CreatedUtc)),
            _ => descending
                ? Comparer<Domain.Collections.Item>.Create((left, right) => CompareDates(right.UpdatedUtc, left.UpdatedUtc))
                : Comparer<Domain.Collections.Item>.Create((left, right) => CompareDates(left.UpdatedUtc, right.UpdatedUtc))
        };
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

    private static bool MatchesAttributeFilters(
        Domain.Collections.Item item,
        IReadOnlyList<ListItemsAttributeFilter> attributeFilters,
        IReadOnlyDictionary<string, Domain.Collections.AttributeDefinition> filterableAttributeLookup)
    {
        if (attributeFilters.Count == 0)
        {
            return true;
        }

        foreach (var filter in attributeFilters)
        {
            if (!filterableAttributeLookup.TryGetValue(filter.AttributeKey, out var attributeDefinition))
            {
                return false;
            }

            var attributeValue = item.AttributeValues
                .FirstOrDefault(value => value.AttributeDefinitionId == attributeDefinition.Id);

            if (attributeValue is null)
            {
                return false;
            }

            var displayValue = attributeValue.GetDisplayValue(attributeDefinition.DataType);

            if (!displayValue.Contains(filter.Value, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        return true;
    }

    private static bool MatchesSearchText(
        Domain.Collections.Item item,
        string? searchText,
        IReadOnlyDictionary<Guid, Domain.Collections.Location> locationLookup,
        IReadOnlyDictionary<Guid, Domain.Collections.Tag> tagLookup,
        IReadOnlyDictionary<Guid, Domain.Collections.AttributeDefinition> attributeDefinitionLookup)
    {
        if (string.IsNullOrWhiteSpace(searchText))
        {
            return true;
        }

        return EnumerateSearchValues(item, locationLookup, tagLookup, attributeDefinitionLookup)
            .Any(value => value.Contains(searchText, StringComparison.OrdinalIgnoreCase));
    }

    private static IEnumerable<string> EnumerateSearchValues(
        Domain.Collections.Item item,
        IReadOnlyDictionary<Guid, Domain.Collections.Location> locationLookup,
        IReadOnlyDictionary<Guid, Domain.Collections.Tag> tagLookup,
        IReadOnlyDictionary<Guid, Domain.Collections.AttributeDefinition> attributeDefinitionLookup)
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
            if (attributeDefinitionLookup.TryGetValue(attributeValue.AttributeDefinitionId, out var attributeDefinition))
            {
                yield return attributeValue.GetDisplayValue(attributeDefinition.DataType);
            }
        }
    }

    private static int CompareStrings(string left, string right, DateTime leftCreatedUtc, DateTime rightCreatedUtc)
    {
        var result = string.Compare(left, right, StringComparison.OrdinalIgnoreCase);
        return result != 0 ? result : CompareDates(leftCreatedUtc, rightCreatedUtc);
    }

    private static int CompareNumbers(int left, int right, DateTime leftCreatedUtc, DateTime rightCreatedUtc)
    {
        var result = left.CompareTo(right);
        return result != 0 ? result : CompareDates(leftCreatedUtc, rightCreatedUtc);
    }

    private static int CompareDates(DateTime left, DateTime right)
    {
        return left.CompareTo(right);
    }
}
