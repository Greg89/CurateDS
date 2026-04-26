using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteItem;

public sealed class DeleteItemService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUser;

    public DeleteItemService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        ICurrentUserService currentUser)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _currentUser = currentUser;
    }

    public async Task ExecuteAsync(DeleteItemCommand command, CancellationToken cancellationToken)
    {
        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            command.CollectionId,
            command.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        var deleted = await _itemRepository.SoftDeleteAsync(
            command.ItemId,
            command.CollectionId,
            DateTime.UtcNow,
            _currentUser.GetCurrentUser(),
            cancellationToken);

        if (!deleted)
        {
            throw new NotFoundException("Item was not found.");
        }
    }
}
