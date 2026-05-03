using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;

namespace CurateDS.Application.Collections.CreateItemType;

public sealed class CreateItemTypeService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemTypeRepository _itemTypeRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateItemTypeCommand> _validator;

    public CreateItemTypeService(
        ICollectionRepository collectionRepository,
        IItemTypeRepository itemTypeRepository,
        ICurrentUserService currentUser,
        IValidator<CreateItemTypeCommand> validator)
    {
        _collectionRepository = collectionRepository;
        _itemTypeRepository = itemTypeRepository;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<CreateItemTypeResult> ExecuteAsync(
        CreateItemTypeCommand command,
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

        var sortOrder = await _itemTypeRepository.GetNextSortOrderAsync(command.CollectionId, cancellationToken);

        var itemType = ItemType.Create(
            command.CollectionId,
            command.Name,
            sortOrder,
            DateTime.UtcNow,
            _currentUser.GetCurrentUser());

        await _itemTypeRepository.AddAsync(itemType, cancellationToken);

        return new CreateItemTypeResult(
            itemType.Id,
            itemType.CollectionId,
            itemType.Name,
            itemType.SortOrder,
            itemType.CreatedUtc);
    }
}
