using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.GetItemDetail;

public sealed class GetItemDetailService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly ILocationRepository _locationRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ITagRepository _tagRepository;

    public GetItemDetailService(
        ICollectionRepository collectionRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository,
        ILocationRepository locationRepository,
        IItemRepository itemRepository,
        ITagRepository tagRepository)
    {
        _collectionRepository = collectionRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
        _locationRepository = locationRepository;
        _itemRepository = itemRepository;
        _tagRepository = tagRepository;
    }

    public async Task<ItemDetailDto> ExecuteAsync(
        GetItemDetailQuery query,
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

        var attributeDefinitions = await _attributeDefinitionRepository.ListByCollectionAsync(
            query.CollectionId,
            cancellationToken);
        var locations = await _locationRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);
        var tags = await _tagRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);

        var attributeDefinitionLookup = attributeDefinitions.ToDictionary(definition => definition.Id);
        var locationLookup = locations.ToDictionary(location => location.Id);
        var tagLookup = tags.ToDictionary(tag => tag.Id);

        var attributeValues = item.AttributeValues
            .Where(attributeValue => attributeDefinitionLookup.ContainsKey(attributeValue.AttributeDefinitionId))
            .OrderBy(attributeValue => attributeDefinitionLookup[attributeValue.AttributeDefinitionId].SortOrder)
            .Select(attributeValue =>
            {
                var attributeDefinition = attributeDefinitionLookup[attributeValue.AttributeDefinitionId];

                return new ItemAttributeValueDto(
                    attributeDefinition.Id,
                    attributeDefinition.Name,
                    attributeDefinition.Key,
                    attributeDefinition.DataType,
                    attributeValue.GetDisplayValue(attributeDefinition.DataType));
            })
            .ToArray();

        return new ItemDetailDto(
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
                .Select(itemTag =>
                {
                    var tag = tagLookup[itemTag.TagId];
                    return new TagDto(tag.Id, tag.Name, tag.Key, tag.CreatedUtc);
                })
                .OrderBy(tag => tag.Name)
                .ToArray(),
            item.CreatedUtc,
            item.UpdatedUtc,
            attributeValues);
    }
}
