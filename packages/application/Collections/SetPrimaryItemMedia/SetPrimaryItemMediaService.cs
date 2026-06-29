using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.SetPrimaryItemMedia;

public sealed class SetPrimaryItemMediaService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;

    public SetPrimaryItemMediaService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        ICatalogUnitOfWork unitOfWork)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task ExecuteAsync(SetPrimaryItemMediaCommand command, CancellationToken cancellationToken)
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

        var assetExists = item.MediaAssets.Any(a => a.Id == command.MediaAssetId);

        if (!assetExists)
        {
            throw new NotFoundException("Media asset was not found on this item.");
        }

        await _unitOfWork.ExecuteInTransactionAsync(
            innerCancellationToken =>
            {
                item.SetPrimaryMedia(command.MediaAssetId);
                return Task.CompletedTask;
            },
            cancellationToken);
    }
}
