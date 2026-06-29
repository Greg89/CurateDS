using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;

namespace CurateDS.Application.Collections.DeleteItem;

public sealed class DeleteItemService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IItemEventRepository _itemEventRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public DeleteItemService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        IItemEventRepository itemEventRepository,
        ICatalogUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _itemEventRepository = itemEventRepository;
        _unitOfWork = unitOfWork;
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

        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        await _unitOfWork.ExecuteInTransactionAsync(
            async innerCancellationToken =>
            {
                var deleted = await _itemRepository.SoftDeleteAsync(
                    command.ItemId,
                    command.CollectionId,
                    now,
                    actor,
                    innerCancellationToken);

                if (!deleted)
                {
                    throw new NotFoundException("Item was not found.");
                }

                await _itemEventRepository.RecordAsync(
                    ItemEvent.Record(command.ItemId, command.CollectionId, ItemEventType.Deleted, now, actor),
                    innerCancellationToken);
            },
            cancellationToken);
    }
}
