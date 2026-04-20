using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.GetItemDetail;

public sealed class GetItemDetailService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly IItemRepository _itemRepository;

    public GetItemDetailService(
        ICollectionRepository collectionRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository,
        IItemRepository itemRepository)
    {
        _collectionRepository = collectionRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
        _itemRepository = itemRepository;
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

        var attributeDefinitionLookup = attributeDefinitions.ToDictionary(definition => definition.Id);

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
            item.CreatedUtc,
            item.UpdatedUtc,
            attributeValues);
    }
}
