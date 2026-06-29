using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class CollectionRepository : ICollectionRepository
{
    private readonly CatalogDbContext _dbContext;

    public CollectionRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Collection collection, CancellationToken cancellationToken)
    {
        await _dbContext.Collections.AddAsync(collection, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, string ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.Collections
            .SingleOrDefaultAsync(
                collection => collection.Id == collectionId && collection.OwnerId == ownerId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<Collection>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.Collections
            .Where(collection => collection.OwnerId == ownerId)
            .OrderByDescending(collection => collection.CreatedUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid collectionId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
    {
        var collection = await _dbContext.Collections
            .SingleOrDefaultAsync(
                c => c.Id == collectionId && c.OwnerId == ownerId,
                cancellationToken);

        if (collection is null)
        {
            return false;
        }

        collection.SoftDelete(deletedUtc, deletedBy);
        return true;
    }

    public async Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        var totalItems = await _dbContext.Items
            .CountAsync(i => i.CollectionId == collectionId, cancellationToken);

        var totalAttributeDefinitions = await _dbContext.AttributeDefinitions
            .CountAsync(a => a.CollectionId == collectionId, cancellationToken);

        var tagsUsed = await _dbContext.ItemTags
            .Where(it => _dbContext.Items.Any(i => i.Id == it.ItemId && i.CollectionId == collectionId))
            .Select(it => it.TagId)
            .Distinct()
            .CountAsync(cancellationToken);

        var locationsUsed = await _dbContext.Items
            .Where(i => i.CollectionId == collectionId && i.LocationId != null)
            .Select(i => i.LocationId)
            .Distinct()
            .CountAsync(cancellationToken);

        var itemsWithNoLocation = await _dbContext.Items
            .CountAsync(i => i.CollectionId == collectionId && i.LocationId == null, cancellationToken);

        var itemsWithNoTags = await _dbContext.Items
            .CountAsync(i => i.CollectionId == collectionId &&
                !_dbContext.ItemTags.Any(it => it.ItemId == i.Id), cancellationToken);

        var totalMediaAssets = await _dbContext.MediaAssets
            .CountAsync(ma => _dbContext.Items.Any(i => i.Id == ma.ItemId && i.CollectionId == collectionId), cancellationToken);

        return new CollectionSummaryDto(
            collectionId,
            totalItems,
            totalAttributeDefinitions,
            tagsUsed,
            locationsUsed,
            itemsWithNoLocation,
            itemsWithNoTags,
            totalMediaAssets);
    }

    public async Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        var itemsByLocation = await _dbContext.Items
            .Where(i => i.CollectionId == collectionId)
            .GroupBy(i => i.LocationId)
            .Select(g => new
            {
                LocationId = g.Key,
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);

        var locationIds = itemsByLocation
            .Where(x => x.LocationId.HasValue)
            .Select(x => x.LocationId!.Value)
            .ToList();

        var locationNames = await _dbContext.Locations
            .Where(l => locationIds.Contains(l.Id))
            .Select(l => new { l.Id, l.Name })
            .ToListAsync(cancellationToken);

        var locationNameLookup = locationNames.ToDictionary(l => l.Id, l => l.Name);

        var byLocation = itemsByLocation
            .Select(x => new ItemsByLocationDto(
                x.LocationId,
                x.LocationId.HasValue && locationNameLookup.TryGetValue(x.LocationId.Value, out var name)
                    ? name
                    : "No Location",
                x.Count))
            .OrderByDescending(x => x.Count)
            .ToArray();

        var itemsByTag = await _dbContext.ItemTags
            .Where(it => _dbContext.Items.Any(i => i.Id == it.ItemId && i.CollectionId == collectionId))
            .GroupBy(it => it.TagId)
            .Select(g => new { TagId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var tagIds = itemsByTag.Select(x => x.TagId).ToList();

        var tagNames = await _dbContext.Tags
            .Where(t => tagIds.Contains(t.Id))
            .Select(t => new { t.Id, t.Name })
            .ToListAsync(cancellationToken);

        var tagNameLookup = tagNames.ToDictionary(t => t.Id, t => t.Name);

        var byTag = itemsByTag
            .Select(x => new ItemsByTagDto(
                x.TagId,
                tagNameLookup.TryGetValue(x.TagId, out var name) ? name : x.TagId.ToString(),
                x.Count))
            .OrderByDescending(x => x.Count)
            .ToArray();

        return new CollectionReportsDto(byLocation, byTag);
    }
}
