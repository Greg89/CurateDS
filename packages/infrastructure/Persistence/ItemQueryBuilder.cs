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
        // Location filter
        if (request.LocationId.HasValue)
            query = query.Where(i => i.LocationId == request.LocationId.Value);

        // Tag filter — item must have ALL requested tag ids
        foreach (var tagId in request.TagIds)
        {
            var capturedId = tagId;
            query = query.Where(i => dbContext.ItemTags.Any(it => it.ItemId == i.Id && it.TagId == capturedId));
        }

        // Attribute value filter — case-insensitive contains on ValueText, matched via key
        foreach (var filter in request.AttributeFilters)
        {
            if (string.IsNullOrWhiteSpace(filter.AttributeKey) || string.IsNullOrWhiteSpace(filter.Value))
                continue;

            var key = filter.AttributeKey.Trim();
            var value = filter.Value.Trim().ToLower();

            query = query.Where(i => dbContext.ItemAttributeValues
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
        }

        // Full-text search across name, description, location, tags, and attribute text values
        if (!string.IsNullOrWhiteSpace(request.SearchText))
        {
            var search = request.SearchText.Trim().ToLower();
            query = query.Where(i =>
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

        // Quantity range
        if (request.MinQuantity.HasValue)
            query = query.Where(i => i.Quantity >= request.MinQuantity.Value);

        if (request.MaxQuantity.HasValue)
            query = query.Where(i => i.Quantity <= request.MaxQuantity.Value);

        // Created date range
        if (request.CreatedAfter.HasValue)
            query = query.Where(i => i.CreatedUtc >= request.CreatedAfter.Value);

        if (request.CreatedBefore.HasValue)
            query = query.Where(i => i.CreatedUtc <= request.CreatedBefore.Value);

        // No-location / no-tags quick filters
        if (request.HasNoLocation)
            query = query.Where(i => i.LocationId == null);

        if (request.HasNoTags)
            query = query.Where(i => !dbContext.ItemTags.Any(it => it.ItemId == i.Id));

        // Item type filter
        if (request.ItemTypeId.HasValue)
            query = query.Where(i => i.ItemTypeId == request.ItemTypeId.Value);

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
