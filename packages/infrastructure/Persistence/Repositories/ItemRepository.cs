using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Common;
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
    }

    public void AddMediaAsset(MediaAsset asset)
    {
        _dbContext.MediaAssets.Add(asset);
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
            .Include(item => item.MediaAssets)
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

    public async Task<PagedResult<ItemSummaryProjection>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken)
    {
        var q = _dbContext.Items
            .Where(i => i.CollectionId == query.CollectionId)
            .ApplyFilters(query, _dbContext);

        var totalCount = await q.CountAsync(cancellationToken);

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 200);

        var items = await q
            .ApplySort(query)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new
            {
                i.Id,
                i.CollectionId,
                i.Name,
                i.Description,
                i.Quantity,
                i.LocationId,
                i.CreatedUtc,
                i.UpdatedUtc,
                LocationName = _dbContext.Locations
                    .Where(l => l.Id == i.LocationId)
                    .Select(l => l.Name)
                    .FirstOrDefault(),
                TagNames = _dbContext.ItemTags
                    .Where(it => it.ItemId == i.Id)
                    .Join(_dbContext.Tags, it => it.TagId, t => t.Id, (it, t) => t.Name)
                    .OrderBy(name => name)
                    .ToList(),
                AttributeValueCount = _dbContext.ItemAttributeValues
                    .Count(iav => iav.ItemId == i.Id),
                PrimaryImageStorageKey = _dbContext.MediaAssets
                    .Where(ma => ma.ItemId == i.Id && ma.IsPrimary)
                    .Select(ma => ma.StorageKey)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var dtos = items.Select(i => new ItemSummaryProjection(
            i.Id,
            i.CollectionId,
            i.Name,
            i.Description,
            i.Quantity,
            i.LocationId,
            i.LocationName,
            i.TagNames,
            i.AttributeValueCount,
            i.CreatedUtc,
            i.UpdatedUtc,
            PrimaryImageStorageKey: i.PrimaryImageStorageKey))
            .ToArray();

        return new PagedResult<ItemSummaryProjection>(dtos, totalCount, page, pageSize);
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
    }
}
