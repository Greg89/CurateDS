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

        // Repository returns storage keys; map to public URLs at the application boundary.
        var dtos = result.Items.Select(projection => new ItemSummaryDto(
            projection.Id,
            projection.CollectionId,
            projection.Name,
            projection.Description,
            projection.Quantity,
            projection.LocationId,
            projection.LocationName,
            projection.Tags,
            projection.AttributeValueCount,
            projection.CreatedUtc,
            projection.UpdatedUtc,
            projection.PrimaryImageStorageKey is null
                ? null
                : _mediaStorageService.GetPublicUrl(projection.PrimaryImageStorageKey))).ToArray();

        return new PagedResult<ItemSummaryDto>(dtos, result.TotalCount, result.Page, result.PageSize);
    }
}
