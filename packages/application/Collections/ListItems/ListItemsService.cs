using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListItems;

public sealed class ListItemsService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;

    public ListItemsService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
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

        // Return owner-scoped API paths, never storage URLs.
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
            projection.PrimaryImageAssetId is null
                ? null
                : MediaContentPath.For(projection.CollectionId, projection.Id, projection.PrimaryImageAssetId.Value))).ToArray();

        return new PagedResult<ItemSummaryDto>(dtos, result.TotalCount, result.Page, result.PageSize);
    }
}
