using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListItems;

public sealed class ListItemsService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IMediaStorageService _mediaStorageService;

    public ListItemsService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        IMediaStorageService mediaStorageService)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _mediaStorageService = mediaStorageService;
    }

    public async Task<PagedResult<ItemSummaryDto>> ExecuteAsync(
        ListItemsQuery query,
        CancellationToken cancellationToken)
    {
        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            query.CollectionId,
            query.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        var result = await _itemRepository.QueryAsync(query, cancellationToken);

        // Repository stores raw storage key in PrimaryImageUrl; map to public URL here.
        var remapped = result.Items.Select(dto => dto.PrimaryImageUrl is not null
            ? dto with { PrimaryImageUrl = _mediaStorageService.GetPublicUrl(dto.PrimaryImageUrl) }
            : dto).ToArray();

        return new PagedResult<ItemSummaryDto>(remapped, result.TotalCount, result.Page, result.PageSize);
    }
}
