using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.Shared;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.UpdateItem;

public sealed class UpdateItemService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly ILocationRepository _locationRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IItemEventRepository _itemEventRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<UpdateItemCommand> _validator;

    public UpdateItemService(
        ICollectionRepository collectionRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository,
        ILocationRepository locationRepository,
        IItemRepository itemRepository,
        ITagRepository tagRepository,
        IItemEventRepository itemEventRepository,
        ICurrentUserService currentUser,
        IValidator<UpdateItemCommand> validator)
    {
        _collectionRepository = collectionRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
        _locationRepository = locationRepository;
        _itemRepository = itemRepository;
        _tagRepository = tagRepository;
        _itemEventRepository = itemEventRepository;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<UpdateItemResult> ExecuteAsync(
        UpdateItemCommand command,
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

        var item = await _itemRepository.GetByIdAsync(command.ItemId, command.CollectionId, cancellationToken);

        if (item is null)
        {
            throw new NotFoundException("Item was not found.");
        }

        var attributeDefinitions = await _attributeDefinitionRepository.ListByCollectionAsync(
            command.CollectionId,
            cancellationToken);

        var attributeDefinitionLookup = attributeDefinitions.ToDictionary(definition => definition.Id);

        var organization = await ItemOrganizationValidator.ValidateAsync(
            command.OwnerId,
            command.LocationId,
            command.TagIds,
            _locationRepository,
            _tagRepository,
            cancellationToken);

        ValidateAttributeValues(command.AttributeValues, attributeDefinitions, attributeDefinitionLookup);

        var attributeValues = command.AttributeValues
            .Select(attributeValue =>
            {
                var attributeDefinition = attributeDefinitionLookup[attributeValue.AttributeDefinitionId];
                return ItemAttributeValue.Create(item.Id, attributeDefinition, attributeValue.Value);
            })
            .ToArray();

        var updatedUtc = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        var changeNotes = BuildChangeNotes(item, command, organization);

        item.UpdateDetails(command.Name, command.Description, command.Quantity, updatedUtc, actor);
        item.AssignLocation(organization.Location?.Id, updatedUtc, actor);
        await _itemRepository.ReplaceAttributeValuesAsync(item.Id, attributeValues, cancellationToken);
        await _itemRepository.ReplaceTagsAsync(
            item.Id,
            ItemOrganizationValidator.BuildItemTags(item.Id, organization.Tags),
            cancellationToken);
        await _itemRepository.SaveChangesAsync(cancellationToken);

        await _itemEventRepository.RecordAsync(
            ItemEvent.Record(item.Id, item.CollectionId, ItemEventType.Updated, updatedUtc, actor, changeNotes),
            cancellationToken);
        await _itemEventRepository.SaveChangesAsync(cancellationToken);

        return new UpdateItemResult(
            item.Id,
            item.CollectionId,
            item.Name,
            item.Description,
            item.Quantity,
            organization.Location?.Id,
            organization.Location?.Name,
            organization.Tags.Select(tag => new TagDto(tag.Id, tag.Name, tag.Key, tag.CreatedUtc)).ToArray(),
            item.CreatedUtc,
            item.UpdatedUtc,
            MapAttributeValues(attributeValues, attributeDefinitions));
    }

    private static IReadOnlyList<ItemAttributeValueDto> MapAttributeValues(
        IEnumerable<ItemAttributeValue> attributeValues,
        IReadOnlyList<AttributeDefinition> attributeDefinitions)
    {
        var definitionLookup = attributeDefinitions.ToDictionary(definition => definition.Id);

        return attributeValues
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
                    nameof(UpdateItemCommand.AttributeValues),
                    "Attribute values must belong to the selected collection."));
            }
        }

        foreach (var missingDefinitionId in requiredDefinitionIds.Except(providedDefinitionIds))
        {
            var attributeDefinition = attributeDefinitionLookup[missingDefinitionId];

            failures.Add(new ValidationFailure(
                nameof(UpdateItemCommand.AttributeValues),
                $"A value for '{attributeDefinition.Name}' is required."));
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }
    }

    private static string? BuildChangeNotes(
        Item item,
        UpdateItemCommand command,
        (Location? Location, IReadOnlyList<Tag> Tags) organization)
    {
        var changes = new List<string>();

        if (!string.Equals(item.Name, command.Name, StringComparison.Ordinal))
            changes.Add($"Name: \"{item.Name}\" → \"{command.Name}\"");

        if (!string.Equals(item.Description, command.Description, StringComparison.Ordinal))
        {
            if (item.Description is null)
                changes.Add("Description added");
            else if (command.Description is null)
                changes.Add("Description removed");
            else
                changes.Add($"Description updated");
        }

        if (item.Quantity != command.Quantity)
            changes.Add($"Quantity: {item.Quantity} → {command.Quantity}");

        if (item.LocationId != command.LocationId)
        {
            var newLocationName = organization.Location?.Name ?? "None";
            changes.Add($"Location → {newLocationName}");
        }

        var oldTagIds = item.ItemTags.Select(t => t.TagId).ToHashSet();
        var newTagIds = command.TagIds.ToHashSet();
        if (!oldTagIds.SetEquals(newTagIds))
        {
            var addedNames = organization.Tags
                .Where(t => !oldTagIds.Contains(t.Id))
                .Select(t => t.Name)
                .ToArray();
            var removedCount = oldTagIds.Except(newTagIds).Count();

            if (addedNames.Length > 0)
                changes.Add($"Tags added: {string.Join(", ", addedNames)}");
            if (removedCount > 0)
                changes.Add($"Tags removed: {removedCount}");
        }

        return changes.Count > 0 ? string.Join("; ", changes) : null;
    }
}
