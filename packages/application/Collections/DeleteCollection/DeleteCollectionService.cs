using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteCollection;

public sealed class DeleteCollectionService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public DeleteCollectionService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        ICatalogUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task ExecuteAsync(DeleteCollectionCommand command, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        await _unitOfWork.ExecuteInTransactionAsync(
            async innerCancellationToken =>
            {
                var deleted = await _collectionRepository.SoftDeleteAsync(
                    command.CollectionId,
                    command.OwnerId,
                    now,
                    actor,
                    innerCancellationToken);

                if (!deleted)
                {
                    throw new NotFoundException("Collection was not found.");
                }

                await _itemRepository.SoftDeleteByCollectionAsync(
                    command.CollectionId,
                    now,
                    actor,
                    innerCancellationToken);
            },
            cancellationToken);
    }
}
