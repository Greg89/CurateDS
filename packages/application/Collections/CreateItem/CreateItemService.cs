using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.CreateItem;

public sealed class CreateItemService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IValidator<CreateItemCommand> _validator;

    public CreateItemService(
        ICollectionRepository collectionRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository,
        IItemRepository itemRepository,
        IValidator<CreateItemCommand> validator)
    {
        _collectionRepository = collectionRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
        _itemRepository = itemRepository;
        _validator = validator;
    }

    public async Task<CreateItemResult> ExecuteAsync(
        CreateItemCommand command,
        CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            command.CollectionId,
            command.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        var attributeDefinitions = await _attributeDefinitionRepository.ListByCollectionAsync(
            command.CollectionId,
            cancellationToken);

        var attributeDefinitionLookup = attributeDefinitions.ToDictionary(definition => definition.Id);

        ValidateAttributeValues(command.AttributeValues, attributeDefinitions, attributeDefinitionLookup);

        var item = Item.Create(
            command.CollectionId,
            command.Name,
            command.Description,
            command.Quantity,
            DateTime.UtcNow);

        foreach (var attributeValueInput in command.AttributeValues)
        {
            var attributeDefinition = attributeDefinitionLookup[attributeValueInput.AttributeDefinitionId];
            var attributeValue = ItemAttributeValue.Create(item.Id, attributeDefinition, attributeValueInput.Value);
            item.AddAttributeValue(attributeValue);
        }

        await _itemRepository.AddAsync(item, cancellationToken);

        return new CreateItemResult(
            item.Id,
            item.CollectionId,
            item.Name,
            item.Description,
            item.Quantity,
            item.CreatedUtc,
            item.UpdatedUtc,
            MapAttributeValues(item, attributeDefinitions));
    }

    private static IReadOnlyList<ItemAttributeValueDto> MapAttributeValues(
        Item item,
        IReadOnlyList<AttributeDefinition> attributeDefinitions)
    {
        var definitionLookup = attributeDefinitions.ToDictionary(definition => definition.Id);

        return item.AttributeValues
            .OrderBy(attributeValue => definitionLookup[attributeValue.AttributeDefinitionId].SortOrder)
            .Select(attributeValue =>
            {
                var attributeDefinition = definitionLookup[attributeValue.AttributeDefinitionId];

                return new ItemAttributeValueDto(
                    attributeDefinition.Id,
                    attributeDefinition.Name,
                    attributeDefinition.Key,
                    attributeDefinition.DataType,
                    attributeValue.GetDisplayValue(attributeDefinition.DataType));
            })
            .ToArray();
    }

    private static void ValidateAttributeValues(
        IReadOnlyList<CreateItemAttributeValueInput> attributeValues,
        IReadOnlyList<AttributeDefinition> attributeDefinitions,
        IReadOnlyDictionary<Guid, AttributeDefinition> attributeDefinitionLookup)
    {
        var failures = new List<ValidationFailure>();

        var requiredDefinitionIds = attributeDefinitions
            .Where(definition => definition.IsRequired)
            .Select(definition => definition.Id)
            .ToHashSet();

        var providedDefinitionIds = attributeValues
            .Select(attributeValue => attributeValue.AttributeDefinitionId)
            .ToHashSet();

        foreach (var attributeValue in attributeValues)
        {
            if (!attributeDefinitionLookup.ContainsKey(attributeValue.AttributeDefinitionId))
            {
                failures.Add(new ValidationFailure(
                    nameof(CreateItemCommand.AttributeValues),
                    "Attribute values must belong to the selected collection."));
            }
        }

        foreach (var missingDefinitionId in requiredDefinitionIds.Except(providedDefinitionIds))
        {
            var attributeDefinition = attributeDefinitionLookup[missingDefinitionId];

            failures.Add(new ValidationFailure(
                nameof(CreateItemCommand.AttributeValues),
                $"A value for '{attributeDefinition.Name}' is required."));
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }
    }
}
