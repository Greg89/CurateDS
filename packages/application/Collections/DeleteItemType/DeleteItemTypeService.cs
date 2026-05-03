using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteItemType;

public sealed class DeleteItemTypeService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemTypeRepository _itemTypeRepository;
    private readonly ICurrentUserService _currentUser;

    public DeleteItemTypeService(
        ICollectionRepository collectionRepository,
        IItemTypeRepository itemTypeRepository,
        ICurrentUserService currentUser)
    {
        _collectionRepository = collectionRepository;
        _itemTypeRepository = itemTypeRepository;
        _currentUser = currentUser;
    }

    public async Task ExecuteAsync(DeleteItemTypeCommand command, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            command.CollectionId,
            command.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        var deleted = await _itemTypeRepository.SoftDeleteAsync(
            command.ItemTypeId,
            command.CollectionId,
            now,
            actor,
            cancellationToken);

        if (!deleted)
        {
            throw new NotFoundException("Item type was not found.");
        }
    }
}
