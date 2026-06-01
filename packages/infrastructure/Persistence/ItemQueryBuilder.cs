using CurateDS.Application.Collections.ListItems;
using CurateDS.Domain.Collections;

namespace CurateDS.Infrastructure.Persistence;

internal static class ItemQueryBuilder
{
    public static IQueryable<Item> ApplyFilters(
        this IQueryable<Item> query,
        ListItemsQuery request,
        CatalogDbContext dbContext)
    {
        query = ApplyLocationFilter(query, request);
        query = ApplyTagFilter(query, request, dbContext);
        query = ApplyAttributeFilters(query, request, dbContext);
        query = ApplySearchFilter(query, request, dbContext);
        query = ApplyQuantityRange(query, request);
        query = ApplyCreatedDateRange(query, request);
        query = ApplyQuickFilters(query, request, dbContext);
        return ApplyItemTypeFilter(query, request);
    }

    private static IQueryable<Item> ApplyLocationFilter(IQueryable<Item> query, ListItemsQuery request)
    {
        if (request.LocationId.HasValue)
            return query.Where(i => i.LocationId == request.LocationId.Value);

        return query;
    }

    private static IQueryable<Item> ApplyTagFilter(
        IQueryable<Item> query,
        ListItemsQuery request,
        CatalogDbContext dbContext)
    {
        if (request.TagIds.Count == 0)
            return query;

        if (request.TagMatchMode == TagMatchMode.Any)
        {
            var tagIds = request.TagIds;
            return query.Where(i => dbContext.ItemTags.Any(it =>
                it.ItemId == i.Id && tagIds.Contains(it.TagId)));
        }

        return request.TagIds.Aggregate(query, (q, tagId) =>
            q.Where(i => dbContext.ItemTags.Any(it => it.ItemId == i.Id && it.TagId == tagId)));
    }

    private static IQueryable<Item> ApplyAttributeFilters(
        IQueryable<Item> query,
        ListItemsQuery request,
        CatalogDbContext dbContext)
    {
        return request.AttributeFilters
            .Where(f => !string.IsNullOrWhiteSpace(f.AttributeKey) && !string.IsNullOrWhiteSpace(f.Value))
            .Aggregate(query, (q, filter) =>
            {
                var key = filter.AttributeKey.Trim();
                var value = filter.Value.Trim().ToLower();
                return q.Where(i => dbContext.ItemAttributeValues
                    .Join(
                        dbContext.AttributeDefinitions.Where(ad =>
                            ad.CollectionId == request.CollectionId && ad.Key == key),
                        iav => iav.AttributeDefinitionId,
                        ad => ad.Id,
                        (iav, ad) => new { iav, ad })
                    .Any(joined =>
                        joined.iav.ItemId == i.Id &&
                        joined.iav.ValueText != null &&
                        joined.iav.ValueText.ToLower().Contains(value)));
            });
    }

    private static IQueryable<Item> ApplySearchFilter(
        IQueryable<Item> query,
        ListItemsQuery request,
        CatalogDbContext dbContext)
    {
        if (string.IsNullOrWhiteSpace(request.SearchText))
            return query;

        var search = request.SearchText.Trim().ToLower();
        return query.Where(i =>
            i.Name.ToLower().Contains(search) ||
            (i.Description != null && i.Description.ToLower().Contains(search)) ||
            (i.LocationId != null && dbContext.Locations.Any(l =>
                l.Id == i.LocationId &&
                (l.Name.ToLower().Contains(search) ||
                 (l.Description != null && l.Description.ToLower().Contains(search))))) ||
            dbContext.ItemTags
                .Join(
                    dbContext.Tags.Where(t => t.Name.ToLower().Contains(search)),
                    it => it.TagId,
                    t => t.Id,
                    (it, t) => it.ItemId)
                .Any(itemId => itemId == i.Id) ||
            dbContext.ItemAttributeValues.Any(iav =>
                iav.ItemId == i.Id &&
                iav.ValueText != null &&
                iav.ValueText.ToLower().Contains(search)));
    }

    private static IQueryable<Item> ApplyQuantityRange(IQueryable<Item> query, ListItemsQuery request)
    {
        if (request.MinQuantity.HasValue)
            query = query.Where(i => i.Quantity >= request.MinQuantity.Value);

        if (request.MaxQuantity.HasValue)
            query = query.Where(i => i.Quantity <= request.MaxQuantity.Value);

        return query;
    }

    private static IQueryable<Item> ApplyCreatedDateRange(IQueryable<Item> query, ListItemsQuery request)
    {
        if (request.CreatedAfter.HasValue)
            query = query.Where(i => i.CreatedUtc >= request.CreatedAfter.Value);

        if (request.CreatedBefore.HasValue)
            query = query.Where(i => i.CreatedUtc <= request.CreatedBefore.Value);

        return query;
    }

    private static IQueryable<Item> ApplyQuickFilters(
        IQueryable<Item> query,
        ListItemsQuery request,
        CatalogDbContext dbContext)
    {
        if (request.HasNoLocation)
            query = query.Where(i => i.LocationId == null);

        if (request.HasNoTags)
            query = query.Where(i => !dbContext.ItemTags.Any(it => it.ItemId == i.Id));

        return query;
    }

    private static IQueryable<Item> ApplyItemTypeFilter(IQueryable<Item> query, ListItemsQuery request)
    {
        if (request.ItemTypeId.HasValue)
            return query.Where(i => i.ItemTypeId == request.ItemTypeId.Value);

        return query;
    }

    public static IQueryable<Item> ApplySort(
        this IQueryable<Item> query,
        ListItemsQuery request)
    {
        var descending = !string.Equals(request.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);

        return request.SortBy?.Trim().ToLowerInvariant() switch
        {
            "name" => descending
                ? query.OrderByDescending(i => i.Name).ThenByDescending(i => i.CreatedUtc)
                : query.OrderBy(i => i.Name).ThenBy(i => i.CreatedUtc),
            "quantity" => descending
                ? query.OrderByDescending(i => i.Quantity).ThenByDescending(i => i.CreatedUtc)
                : query.OrderBy(i => i.Quantity).ThenBy(i => i.CreatedUtc),
            "createdutc" or "created" => descending
                ? query.OrderByDescending(i => i.CreatedUtc)
                : query.OrderBy(i => i.CreatedUtc),
            _ => descending
                ? query.OrderByDescending(i => i.UpdatedUtc ?? i.CreatedUtc).ThenByDescending(i => i.CreatedUtc)
                : query.OrderBy(i => i.UpdatedUtc ?? i.CreatedUtc).ThenBy(i => i.CreatedUtc)
        };
    }
}
