using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListAttributeDefinitions;

public sealed class ListAttributeDefinitionsService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;

    public ListAttributeDefinitionsService(
        ICollectionRepository collectionRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository)
    {
        _collectionRepository = collectionRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
    }

    public async Task<IReadOnlyList<AttributeDefinitionDto>> ExecuteAsync(
        ListAttributeDefinitionsQuery query,
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

        var attributeDefinitions = await _attributeDefinitionRepository.ListByCollectionAsync(query.CollectionId, cancellationToken);

        return attributeDefinitions
            .Select(definition => new AttributeDefinitionDto(
                definition.Id,
                definition.CollectionId,
                definition.Name,
                definition.Key,
                definition.DataType,
                definition.IsRequired,
                definition.IsFilterable,
                definition.SortOrder,
                definition.CreatedUtc))
            .ToArray();
    }
}
