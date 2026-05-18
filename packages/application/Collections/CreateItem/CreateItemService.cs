using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Application.Collections.Shared;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.CreateItem;

public sealed class CreateItemService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly ILocationRepository _locationRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IItemEventRepository _itemEventRepository;
    private readonly IItemTypeRepository _itemTypeRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateItemCommand> _validator;

    public CreateItemService(
        ICollectionRepository collectionRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository,
        ILocationRepository locationRepository,
        IItemRepository itemRepository,
        ITagRepository tagRepository,
        IItemEventRepository itemEventRepository,
        IItemTypeRepository itemTypeRepository,
        ICurrentUserService currentUser,
        IValidator<CreateItemCommand> validator)
    {
        _collectionRepository = collectionRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
        _locationRepository = locationRepository;
        _itemRepository = itemRepository;
        _tagRepository = tagRepository;
        _itemEventRepository = itemEventRepository;
        _itemTypeRepository = itemTypeRepository;
        _currentUser = currentUser;
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

        if (command.ItemTypeId.HasValue)
        {
            var itemType = await _itemTypeRepository.GetByIdAndCollectionAsync(
                command.ItemTypeId.Value,
                command.CollectionId,
                cancellationToken);

            if (itemType is null)
            {
                throw new ValidationException([new ValidationFailure(
                    nameof(CreateItemCommand.ItemTypeId),
                    "Item type was not found in this collection.")]);
            }
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

        ItemAttributeValueValidator.Validate(command.AttributeValues, attributeDefinitions, attributeDefinitionLookup, command.ItemTypeId);

        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        // Pre-generate the item ID so attribute values and tags can reference it
        // before the item is constructed. This lets Item.Create set them directly
        // in the constructor without triggering SetUpdated, keeping UpdatedUtc null.
        var itemId = Guid.NewGuid();

        var attributeValues = command.AttributeValues
            .Select(input =>
            {
                var definition = attributeDefinitionLookup[input.AttributeDefinitionId];
                return ItemAttributeValue.Create(itemId, definition, input.Value);
            })
            .ToList();

        var tags = ItemOrganizationValidator.BuildItemTags(itemId, organization.Tags);

        var item = Item.Create(
            itemId,
            command.CollectionId,
            command.Name,
            command.Description,
            command.Quantity,
            organization.Location?.Id,
            command.ItemTypeId,
            tags,
            attributeValues,
            now,
            actor);

        await _itemRepository.AddAsync(item, cancellationToken);

        await _itemEventRepository.RecordAsync(
            ItemEvent.Record(item.Id, item.CollectionId, ItemEventType.Created, now, actor),
            cancellationToken);
        await _itemEventRepository.SaveChangesAsync(cancellationToken);

        return new CreateItemResult(
            item.Id,
            item.CollectionId,
            item.Name,
            item.Description,
            item.Quantity,
            organization.Location?.Id,
            organization.Location?.Name,
            item.ItemTypeId,
            organization.Tags.Select(tag => new TagDto(tag.Id, tag.Name, tag.Key, tag.CreatedUtc)).ToArray(),
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

}
