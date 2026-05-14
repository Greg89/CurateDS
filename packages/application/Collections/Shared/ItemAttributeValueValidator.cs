using CurateDS.Application.Collections.CreateItem;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.Shared;

internal static class ItemAttributeValueValidator
{
    public static void Validate(
        IReadOnlyList<CreateItemAttributeValueInput> attributeValues,
        IReadOnlyList<AttributeDefinition> attributeDefinitions,
        IReadOnlyDictionary<Guid, AttributeDefinition> attributeDefinitionLookup,
        Guid? itemTypeId)
    {
        var failures = new List<ValidationFailure>();

        // Valid definitions for this item: global (null ItemTypeId) OR matching the item's type
        var validDefinitions = attributeDefinitions
            .Where(d => d.ItemTypeId == null || d.ItemTypeId == itemTypeId)
            .ToList();

        var validDefinitionIds = validDefinitions.Select(d => d.Id).ToHashSet();

        var requiredDefinitionIds = validDefinitions
            .Where(definition => definition.IsRequired)
            .Select(definition => definition.Id)
            .ToHashSet();

        var providedDefinitionIds = attributeValues
            .Select(attributeValue => attributeValue.AttributeDefinitionId)
            .ToHashSet();

        failures.AddRange(attributeValues
            .Where(attributeValue => !validDefinitionIds.Contains(attributeValue.AttributeDefinitionId))
            .Select(_ => new ValidationFailure(
                "AttributeValues",
                "Attribute values must belong to the selected collection and item type.")));

        foreach (var missingDefinitionId in requiredDefinitionIds.Except(providedDefinitionIds))
        {
            var attributeDefinition = attributeDefinitionLookup[missingDefinitionId];

            failures.Add(new ValidationFailure(
                "AttributeValues",
                $"A value for '{attributeDefinition.Name}' is required."));
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }
    }
}
