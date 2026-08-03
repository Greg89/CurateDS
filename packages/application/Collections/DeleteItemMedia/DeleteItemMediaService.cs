using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteItemMedia;

public sealed class DeleteItemMediaService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly IMediaStorageService _mediaStorageService;

    public DeleteItemMediaService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        ICatalogUnitOfWork unitOfWork,
        IMediaStorageService mediaStorageService)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _unitOfWork = unitOfWork;
        _mediaStorageService = mediaStorageService;
    }

    public async Task ExecuteAsync(DeleteItemMediaCommand command, CancellationToken cancellationToken)
    {
        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            command.CollectionId,
            command.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        var item = await _itemRepository.GetByIdAsync(
            command.ItemId,
            command.CollectionId,
            cancellationToken);

        if (item is null)
        {
            throw new NotFoundException("Item was not found.");
        }

        var asset = item.MediaAssets.SingleOrDefault(a => a.Id == command.MediaAssetId);

        if (asset is null)
        {
            throw new NotFoundException("Media asset was not found on this item.");
        }

        var storageKey = asset.StorageKey;

        await _unitOfWork.ExecuteInTransactionAsync(
            innerCancellationToken =>
            {
                item.RemoveMedia(command.MediaAssetId);
                return Task.CompletedTask;
            },
            cancellationToken);

        // Best-effort: delete from storage after the DB record is removed.
        await _mediaStorageService.DeleteAsync(storageKey, cancellationToken);
    }
}
