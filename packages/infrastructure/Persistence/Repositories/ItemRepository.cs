using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class ItemRepository : IItemRepository
{
    private readonly CatalogDbContext _dbContext;

    public ItemRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Item item, CancellationToken cancellationToken)
    {
        await _dbContext.Items.AddAsync(item, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task ReplaceAttributeValuesAsync(
        Guid itemId,
        IReadOnlyList<ItemAttributeValue> attributeValues,
        CancellationToken cancellationToken)
    {
        var existingAttributeValues = await _dbContext.ItemAttributeValues
            .Where(attributeValue => attributeValue.ItemId == itemId)
            .ToListAsync(cancellationToken);

        _dbContext.ItemAttributeValues.RemoveRange(existingAttributeValues);
        await _dbContext.ItemAttributeValues.AddRangeAsync(attributeValues, cancellationToken);
    }

    public async Task ReplaceTagsAsync(
        Guid itemId,
        IReadOnlyList<ItemTag> itemTags,
        CancellationToken cancellationToken)
    {
        var existingItemTags = await _dbContext.ItemTags
            .Where(itemTag => itemTag.ItemId == itemId)
            .ToListAsync(cancellationToken);

        _dbContext.ItemTags.RemoveRange(existingItemTags);
        await _dbContext.ItemTags.AddRangeAsync(itemTags, cancellationToken);
    }

    public async Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken)
    {
        return await _dbContext.Items
            .Include(item => item.AttributeValues)
            .Include(item => item.ItemTags)
            .SingleOrDefaultAsync(
                item => item.Id == itemId && item.CollectionId == collectionId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        return await _dbContext.Items
            .Include(item => item.AttributeValues)
            .Include(item => item.ItemTags)
            .Where(item => item.CollectionId == collectionId)
            .OrderByDescending(item => item.CreatedUtc)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid itemId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
    {
        var item = await _dbContext.Items
            .SingleOrDefaultAsync(
                i => i.Id == itemId && i.CollectionId == collectionId,
                cancellationToken);

        if (item is null)
        {
            return false;
        }

        item.SoftDelete(deletedUtc, deletedBy);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task SoftDeleteByCollectionAsync(Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
    {
        var items = await _dbContext.Items
            .Where(i => i.CollectionId == collectionId)
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            item.SoftDelete(deletedUtc, deletedBy);
        }

        if (items.Count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
