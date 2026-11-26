using CurateDS.Application.Collections.GetCollectionInsights;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using CurateDS.Infrastructure.Persistence.Repositories;
using FluentAssertions;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class CollectionInsightsTests
{
    [Theory]
    [InlineData(AttributeDataType.Text, "Red", "Redwood")]
    [InlineData(AttributeDataType.Number, "2", "20")]
    [InlineData(AttributeDataType.Decimal, "2.12", "2.13")]
    [InlineData(AttributeDataType.Boolean, "false", "true")]
    [InlineData(AttributeDataType.Date, "2026-01-01", "2026-01-02")]
    public async Task Buckets_ShouldMatchExactDrillThrough_AndExcludeDeletedAndForeignItems(AttributeDataType dataType, string value, string otherValue)
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        await using var db = new CatalogDbContext(database.Options);
        await database.InitializeAsync(db);
        var now = DateTime.UtcNow;
        var month = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var collection = Collection.Create("owner", "Test collection", now, "owner");
        var foreign = Collection.Create("someone-else", "Foreign collection", now, "someone-else");
        var definition = AttributeDefinition.Create(collection.Id, "Test field", dataType, false, true, 0, now, "owner");
        db.Collections.AddRange(collection, foreign);
        db.AttributeDefinitions.Add(definition);
        foreach (var entry in new[] { (collection.Id, value, false), (collection.Id, otherValue, false), (collection.Id, value, true), (foreign.Id, value, false) })
        {
            var item = Item.Create(entry.Id, "Test item", null, 1, month, "owner");
            item.AttributeValues.Add(ItemAttributeValue.Create(item.Id, definition, entry.Item2));
            if (entry.Item3) item.SoftDelete(now, "owner");
            db.Items.Add(item);
        }
        var previous = Item.Create(collection.Id, "Last month", null, 1, month.AddTicks(-10), "owner");
        db.Items.Add(previous);
        await db.SaveChangesAsync();
        var collections = new CollectionRepository(db);
        var service = new GetCollectionInsightsService(collections, new CollectionInsightsRepository(db, collections));
        var result = await service.ExecuteAsync("owner", collection.Id, definition.Id, default);
        result.Summary.TotalItems.Should().Be(3);
        result.AddedByMonth.Should().HaveCount(12);
        result.AddedByMonth.Last().Count.Should().Be(2);
        result.AddedByMonth[^2].Count.Should().Be(1);
        result.Attribute!.TotalWithValue.Should().Be(2);
        var items = new ItemRepository(db);
        var query = new ListItemsQuery("owner", collection.Id, null, null, [], [], "name", "asc", 1, 48);
        foreach (var bucket in result.Attribute.Values)
        {
            var match = await items.QueryAsync(query with { ExactAttributeKey = definition.Key, ExactAttributeValue = bucket.Value }, default);
            match.TotalCount.Should().Be(bucket.Count);
            match.TotalCount.Should().Be(1);
        }
        (await items.QueryAsync(query with { CreatedAfter = month.AddMonths(-1), CreatedBeforeExclusive = month }, default)).Items.Should().ContainSingle().Which.Id.Should().Be(previous.Id);
        (await items.QueryAsync(query with { HasNoItemType = true }, default)).TotalCount.Should().Be(3);
        Func<Task> denied = () => service.ExecuteAsync("another-owner", collection.Id, definition.Id, default);
        await denied.Should().ThrowAsync<NotFoundException>();
        Func<Task> wrongAttribute = () => service.ExecuteAsync("someone-else", foreign.Id, definition.Id, default);
        await wrongAttribute.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ActivityPagination_ShouldIncludeDeletedItemsAndKeepStableCounts()
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        await using var db = new CatalogDbContext(database.Options);
        await database.InitializeAsync(db);
        var now = DateTime.UtcNow;
        var collection = Collection.Create("owner", "Activity history", now, "owner");
        var deleted = Item.Create(collection.Id, "Deleted item", null, 1, now, "owner");
        var kept = Item.Create(collection.Id, "Kept item", null, 1, now, "owner");
        deleted.SoftDelete(now, "owner");
        db.Collections.Add(collection); db.Items.AddRange(deleted, kept);
        db.ItemEvents.AddRange(ItemEvent.Record(deleted.Id, collection.Id, ItemEventType.Deleted, now, "owner"),
            ItemEvent.Record(kept.Id, collection.Id, ItemEventType.Created, now.AddDays(-1), "owner"));
        await db.SaveChangesAsync();
        var repo = new ItemEventRepository(db);
        var page = await repo.ListByCollectionAsync(collection.Id, 1, 1, default);
        page.TotalCount.Should().Be(2);
        page.Items.Should().ContainSingle().Which.ItemName.Should().Be("Deleted item");
        (await repo.ListByCollectionAsync(collection.Id, 2, 1, default)).Items.Should().ContainSingle().Which.ItemName.Should().Be("Kept item");
    }
    [Fact]
    public async Task EmptyAndHighCardinalityCollections_ShouldReturnZeroMonthsAndBoundedBuckets()
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        await using var db = new CatalogDbContext(database.Options);
        await database.InitializeAsync(db);
        var collection = Collection.Create("owner", "Many values", DateTime.UtcNow, "owner");
        db.Collections.Add(collection);
        var definition = AttributeDefinition.Create(collection.Id, "Edition", AttributeDataType.Text, false, true, 0, DateTime.UtcNow, "owner");
        db.AttributeDefinitions.Add(definition);
        await db.SaveChangesAsync();
        var repo = new CollectionInsightsRepository(db, new CollectionRepository(db));
        var empty = await repo.GetAsync(collection.Id, definition.Id, default);
        empty.AddedByMonth.Should().OnlyContain(month => month.Count == 0);
        empty.Attribute!.Values.Should().BeEmpty();
        for (var index = 0; index < 25; index++)
        {
            var item = Item.Create(collection.Id, $"Item {index}", null, 1, DateTime.UtcNow, "owner");
            item.AttributeValues.Add(ItemAttributeValue.Create(item.Id, definition, $"Edition {index:D2}"));
            db.Items.Add(item);
        }
        await db.SaveChangesAsync();
        var result = await repo.GetAsync(collection.Id, definition.Id, default);
        result.Attribute!.TotalWithValue.Should().Be(25);
        result.Attribute.Values.Should().HaveCount(20);
    }
}
