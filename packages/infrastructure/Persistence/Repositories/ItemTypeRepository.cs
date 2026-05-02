using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class ItemTypeRepository : IItemTypeRepository
{
    private readonly CatalogDbContext _dbContext;

    public ItemTypeRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(ItemType itemType, CancellationToken cancellationToken)
    {
        await _dbContext.ItemTypes.AddAsync(itemType, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        var max = await _dbContext.ItemTypes
            .Where(itemType => itemType.CollectionId == collectionId)
            .Select(itemType => (int?)itemType.SortOrder)
            .MaxAsync(cancellationToken);

        return (max ?? -1) + 1;
    }

    public Task<ItemType?> GetByIdAndCollectionAsync(Guid itemTypeId, Guid collectionId, CancellationToken cancellationToken)
    {
        return _dbContext.ItemTypes
            .SingleOrDefaultAsync(
                itemType => itemType.Id == itemTypeId && itemType.CollectionId == collectionId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<ItemType>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        return await _dbContext.ItemTypes
            .Where(itemType => itemType.CollectionId == collectionId)
            .OrderBy(itemType => itemType.SortOrder)
            .ThenBy(itemType => itemType.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(
        Guid itemTypeId,
        Guid collectionId,
        DateTime deletedUtc,
        string deletedBy,
        CancellationToken cancellationToken)
    {
        var itemType = await _dbContext.ItemTypes
            .SingleOrDefaultAsync(
                it => it.Id == itemTypeId && it.CollectionId == collectionId,
                cancellationToken);

        if (itemType is null)
            return false;

        itemType.SoftDelete(deletedUtc, deletedBy);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
