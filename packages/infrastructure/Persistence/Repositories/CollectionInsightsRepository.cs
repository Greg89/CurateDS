using System.Globalization;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class CollectionInsightsRepository(CatalogDbContext db, ICollectionRepository collections) : ICollectionInsightsRepository
{
    public async Task<CollectionInsightsDto> GetAsync(Guid collectionId, Guid? attributeDefinitionId, CancellationToken cancellationToken)
    {
        var items = db.Items.AsNoTracking().Where(item => item.CollectionId == collectionId);
        var summary = await collections.GetSummaryAsync(collectionId, cancellationToken);
        var reports = await collections.GetReportsAsync(collectionId, cancellationToken);
        var types = await items.GroupBy(item => item.ItemTypeId)
            .Select(group => new { Id = group.Key, Count = group.Count() }).ToListAsync(cancellationToken);
        var names = await db.ItemTypes.Where(type => type.CollectionId == collectionId)
            .ToDictionaryAsync(type => type.Id, type => type.Name, cancellationToken);
        var now = DateTime.UtcNow;
        var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11);
        var end = start.AddMonths(12);
        var months = await items.Where(item => item.CreatedUtc >= start && item.CreatedUtc < end)
            .GroupBy(item => new { item.CreatedUtc.Year, item.CreatedUtc.Month })
            .Select(group => new { group.Key.Year, group.Key.Month, Count = group.Count() }).ToListAsync(cancellationToken);
        AttributeBreakdownDto? attribute = null;
        if (attributeDefinitionId.HasValue)
        {
            var definition = await db.AttributeDefinitions.AsNoTracking().SingleOrDefaultAsync(
                value => value.CollectionId == collectionId && value.Id == attributeDefinitionId && value.IsFilterable, cancellationToken);
            if (definition is null) throw new NotFoundException("Filterable attribute was not found.");
            var values = db.ItemAttributeValues.Where(value => value.AttributeDefinitionId == definition.Id && items.Any(item => item.Id == value.ItemId));
            var total = await values.CountAsync(cancellationToken);
            // Aggregate in the database and bound high-cardinality fields before materializing.
            var buckets = await values.GroupBy(value => new { value.ValueText, value.ValueNumber, value.ValueDecimal, value.ValueBoolean, value.ValueDate })
                .Select(group => new { group.Key.ValueText, group.Key.ValueNumber, group.Key.ValueDecimal, group.Key.ValueBoolean, group.Key.ValueDate, Count = group.Count() })
                .OrderByDescending(value => value.Count).ThenBy(value => value.ValueText).ThenBy(value => value.ValueNumber)
                .ThenBy(value => value.ValueDecimal).ThenBy(value => value.ValueBoolean).ThenBy(value => value.ValueDate)
                .Take(20).ToListAsync(cancellationToken);
            attribute = new AttributeBreakdownDto(definition.Id, definition.Key, definition.Name, total,
                buckets.Select(value => new AttributeBucketDto(value.ValueText
                    ?? value.ValueNumber?.ToString(CultureInfo.InvariantCulture)
                    ?? value.ValueDecimal?.ToString(CultureInfo.InvariantCulture)
                    ?? (value.ValueBoolean.HasValue ? value.ValueBoolean.Value ? "true" : "false" : null)
                    ?? value.ValueDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "", value.Count)).ToArray());
        }
        return new CollectionInsightsDto(collectionId, summary, reports,
            types.Select(type => new ItemsByTypeDto(type.Id, type.Id.HasValue && names.TryGetValue(type.Id.Value, out var name) ? name : "No item type", type.Count)).OrderByDescending(type => type.Count).ThenBy(type => type.Name).ToArray(),
            Enumerable.Range(0, 12).Select(index => { var from = start.AddMonths(index); return new ItemsAddedMonthDto(from, from.AddMonths(1), months.SingleOrDefault(month => month.Year == from.Year && month.Month == from.Month)?.Count ?? 0); }).ToArray(), attribute);
    }
}
