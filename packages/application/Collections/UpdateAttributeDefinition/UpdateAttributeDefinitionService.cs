using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.UpdateAttributeDefinition;

public sealed class UpdateAttributeDefinitionService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly IItemTypeRepository _itemTypeRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<UpdateAttributeDefinitionCommand> _validator;

    public UpdateAttributeDefinitionService(
        ICollectionRepository collectionRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository,
        IItemTypeRepository itemTypeRepository,
        ICurrentUserService currentUser,
        IValidator<UpdateAttributeDefinitionCommand> validator)
    {
        _collectionRepository = collectionRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
        _itemTypeRepository = itemTypeRepository;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<UpdateAttributeDefinitionResult> ExecuteAsync(
        UpdateAttributeDefinitionCommand command,
        CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        if (await _collectionRepository.GetByIdAndOwnerAsync(
                command.CollectionId,
                command.OwnerId,
                cancellationToken) is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        var attributeDefinition = await _attributeDefinitionRepository.GetByIdAndCollectionAsync(
            command.AttributeDefinitionId,
            command.CollectionId,
            cancellationToken)
            ?? throw new NotFoundException("Attribute definition was not found.");

        if (command.ItemTypeId.HasValue)
        {
            var itemType = await _itemTypeRepository.GetByIdAndCollectionAsync(
                command.ItemTypeId.Value,
                command.CollectionId,
                cancellationToken);

            if (itemType is null)
            {
                throw new ValidationException([new ValidationFailure(
                    nameof(UpdateAttributeDefinitionCommand.ItemTypeId),
                    "Item type was not found in this collection.")]);
            }
        }

        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        var originalKey = attributeDefinition.Key;
        attributeDefinition.Update(
            command.Name,
            command.IsRequired,
            command.IsFilterable,
            command.ItemTypeId,
            now,
            actor);

        if (attributeDefinition.Key != originalKey
            && await _attributeDefinitionRepository.ExistsByKeyExcludingAsync(
                command.CollectionId,
                attributeDefinition.Key,
                attributeDefinition.Id,
                cancellationToken))
        {
            throw new ValidationException([
                new ValidationFailure(nameof(UpdateAttributeDefinitionCommand.Name), "An attribute with this name already exists.")
                {
                    ErrorCode = "duplicate_attribute"
                }
            ]);
        }

        await _attributeDefinitionRepository.SaveChangesAsync(cancellationToken);

        return new UpdateAttributeDefinitionResult(
            attributeDefinition.Id,
            attributeDefinition.CollectionId,
            attributeDefinition.Name,
            attributeDefinition.Key,
            attributeDefinition.DataType,
            attributeDefinition.IsRequired,
            attributeDefinition.IsFilterable,
            attributeDefinition.SortOrder,
            attributeDefinition.ItemTypeId,
            attributeDefinition.CreatedUtc,
            attributeDefinition.UpdatedUtc);
    }
}
