using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteCollection;

public sealed class DeleteCollectionService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUser;

    public DeleteCollectionService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        ICurrentUserService currentUser)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _currentUser = currentUser;
    }

    public async Task ExecuteAsync(DeleteCollectionCommand command, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        // Verify collection exists and belongs to owner before cascading.
        var deleted = await _collectionRepository.SoftDeleteAsync(
            command.CollectionId,
            command.OwnerId,
            now,
            actor,
            cancellationToken);

        if (!deleted)
        {
            throw new NotFoundException("Collection was not found.");
        }

        // Cascade: soft-delete all items in the collection.
        await _itemRepository.SoftDeleteByCollectionAsync(command.CollectionId, now, actor, cancellationToken);
    }
}
