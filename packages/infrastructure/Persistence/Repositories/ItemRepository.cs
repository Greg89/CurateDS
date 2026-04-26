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

    public async Task<PagedResult<ItemSummaryDto>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken)
    {
        var q = _dbContext.Items
            .Where(i => i.CollectionId == query.CollectionId)
            .AsQueryable();

        // Location filter
        if (query.LocationId.HasValue)
        {
            q = q.Where(i => i.LocationId == query.LocationId.Value);
        }

        // Tag filter — item must have ALL requested tag ids
        foreach (var tagId in query.TagIds)
        {
            var capturedId = tagId;
            q = q.Where(i => _dbContext.ItemTags.Any(it => it.ItemId == i.Id && it.TagId == capturedId));
        }

        // Attribute filters
        foreach (var filter in query.AttributeFilters)
        {
            if (string.IsNullOrWhiteSpace(filter.AttributeKey) || string.IsNullOrWhiteSpace(filter.Value))
                continue;

            var key = filter.AttributeKey.Trim();
            var value = filter.Value.Trim();

            q = q.Where(i => _dbContext.ItemAttributeValues
                .Join(
                    _dbContext.AttributeDefinitions.Where(ad => ad.CollectionId == query.CollectionId && ad.Key == key),
                    iav => iav.AttributeDefinitionId,
                    ad => ad.Id,
                    (iav, ad) => new { iav, ad })
                .Any(joined =>
                    joined.iav.ItemId == i.Id &&
                    (joined.iav.ValueText != null && EF.Functions.ILike(joined.iav.ValueText, $"%{value}%"))));
        }

        // Full-text search across name, description, location name, tag names, attribute text values
        if (!string.IsNullOrWhiteSpace(query.SearchText))
        {
            var search = query.SearchText.Trim();
            q = q.Where(i =>
                EF.Functions.ILike(i.Name, $"%{search}%") ||
                (i.Description != null && EF.Functions.ILike(i.Description, $"%{search}%")) ||
                (i.LocationId != null && _dbContext.Locations.Any(l =>
                    l.Id == i.LocationId &&
                    (EF.Functions.ILike(l.Name, $"%{search}%") ||
                     (l.Description != null && EF.Functions.ILike(l.Description, $"%{search}%"))))) ||
                _dbContext.ItemTags
                    .Join(_dbContext.Tags.Where(t => EF.Functions.ILike(t.Name, $"%{search}%")),
                        it => it.TagId, t => t.Id, (it, t) => it.ItemId)
                    .Any(itemId => itemId == i.Id) ||
                _dbContext.ItemAttributeValues.Any(iav =>
                    iav.ItemId == i.Id &&
                    iav.ValueText != null &&
                    EF.Functions.ILike(iav.ValueText, $"%{search}%")));
        }

        var totalCount = await q.CountAsync(cancellationToken);

        // Sorting
        var descending = !string.Equals(query.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);
        q = query.SortBy?.Trim().ToLowerInvariant() switch
        {
            "name" => descending
                ? q.OrderByDescending(i => i.Name).ThenByDescending(i => i.CreatedUtc)
                : q.OrderBy(i => i.Name).ThenBy(i => i.CreatedUtc),
            "quantity" => descending
                ? q.OrderByDescending(i => i.Quantity).ThenByDescending(i => i.CreatedUtc)
                : q.OrderBy(i => i.Quantity).ThenBy(i => i.CreatedUtc),
            "createdutc" or "created" => descending
                ? q.OrderByDescending(i => i.CreatedUtc)
                : q.OrderBy(i => i.CreatedUtc),
            _ => descending
                ? q.OrderByDescending(i => i.UpdatedUtc ?? i.CreatedUtc).ThenByDescending(i => i.CreatedUtc)
                : q.OrderBy(i => i.UpdatedUtc ?? i.CreatedUtc).ThenBy(i => i.CreatedUtc)
        };

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 200);

        var items = await q
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
                    .Count(iav => iav.ItemId == i.Id)
            })
            .ToListAsync(cancellationToken);

        var dtos = items.Select(i => new ItemSummaryDto(
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
            i.UpdatedUtc))
            .ToArray();

        return new PagedResult<ItemSummaryDto>(dtos, totalCount, page, pageSize);
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
