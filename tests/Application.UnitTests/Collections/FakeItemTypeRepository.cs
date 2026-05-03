using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;

namespace CurateDS.Application.UnitTests.Collections;

internal sealed class FakeItemTypeRepository : IItemTypeRepository
{
    private readonly List<ItemType> _itemTypes;

    public FakeItemTypeRepository(params ItemType[] itemTypes)
    {
        _itemTypes = itemTypes.ToList();
    }

    public Task AddAsync(ItemType itemType, CancellationToken cancellationToken)
    {
        _itemTypes.Add(itemType);
        return Task.CompletedTask;
    }

    public Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken)
        => Task.FromResult(_itemTypes.Count(it => it.CollectionId == collectionId));

    public Task<ItemType?> GetByIdAndCollectionAsync(Guid itemTypeId, Guid collectionId, CancellationToken cancellationToken)
        => Task.FromResult(_itemTypes.SingleOrDefault(it => it.Id == itemTypeId && it.CollectionId == collectionId));

    public Task<IReadOnlyList<ItemType>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<ItemType>>(_itemTypes.Where(it => it.CollectionId == collectionId).ToArray());

    public Task<bool> SoftDeleteAsync(Guid itemTypeId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
        => Task.FromResult(false);
}
