using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListCollectionActivity;

public sealed class ListCollectionActivityService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemEventRepository _itemEventRepository;

    public ListCollectionActivityService(
        ICollectionRepository collectionRepository,
        IItemEventRepository itemEventRepository)
    {
        _collectionRepository = collectionRepository;
        _itemEventRepository = itemEventRepository;
    }

    public async Task<PagedResult<CollectionActivityEventDto>> ExecuteAsync(
        ListCollectionActivityQuery query,
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

        return await _itemEventRepository.ListByCollectionAsync(
            query.CollectionId,
            query.Page,
            query.PageSize,
            cancellationToken);
    }
}
