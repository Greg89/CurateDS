using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListItemTypes;

public sealed class ListItemTypesService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemTypeRepository _itemTypeRepository;

    public ListItemTypesService(
        ICollectionRepository collectionRepository,
        IItemTypeRepository itemTypeRepository)
    {
        _collectionRepository = collectionRepository;
        _itemTypeRepository = itemTypeRepository;
    }

    public async Task<IReadOnlyList<ItemTypeDto>> ExecuteAsync(
        ListItemTypesQuery query,
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

        var itemTypes = await _itemTypeRepository.ListByCollectionAsync(query.CollectionId, cancellationToken);

        return itemTypes
            .Select(it => new ItemTypeDto(it.Id, it.CollectionId, it.Name, it.SortOrder, it.CreatedUtc))
            .ToList();
    }
}
