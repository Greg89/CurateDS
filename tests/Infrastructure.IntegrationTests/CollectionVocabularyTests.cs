using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class CollectionVocabularyTests
{
    [Fact]
    public async Task Vocabulary_ShouldUpgradeExistingCollectionsAndRoundTripWithoutChangingPresentation()
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        var collection = Collection.Create("owner", "Reading room", DateTime.UtcNow, "owner", color: "clay");
        await using (var db = new CatalogDbContext(database.Options))
        {
            var legacyId = Guid.NewGuid();
            if (database.IsPostgres)
            {
                await db.GetService<IMigrator>().MigrateAsync("20261003133255_AddCollectionPresentation");
                await db.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO collections ("Id", "OwnerId", "Name", "CreatedUtc", "CreatedBy")
                    VALUES ({legacyId}, {"owner"}, {"Old collection"}, {DateTime.UtcNow}, {"owner"})
                    """);
            }
            await database.InitializeAsync(db);
            if (database.IsPostgres)
            {
                var legacy = await db.Collections.SingleAsync(c => c.Id == legacyId);
                legacy.ItemLabel.Should().Be("item"); legacy.ItemsLabel.Should().Be("items");
            }
            collection.UpdatePresentation(false, true, false, true, [], DateTime.UtcNow, "owner");
            db.Collections.Add(collection); await db.SaveChangesAsync();
        }
        await using (var db = new CatalogDbContext(database.Options))
        {
            var saved = await db.Collections.SingleAsync(c => c.Id == collection.Id);
            saved.UpdateVocabulary(" book ", " books ", DateTime.UtcNow, "owner");
            await db.SaveChangesAsync();
        }
        await using (var db = new CatalogDbContext(database.Options))
        {
            var saved = await db.Collections.SingleAsync(c => c.Id == collection.Id);
            saved.ItemLabel.Should().Be("book"); saved.ItemsLabel.Should().Be("books");
            saved.ShowCover.Should().BeFalse(); saved.ShowPinnedItems.Should().BeFalse(); saved.Color.Should().Be("clay");
            saved.UpdateVocabulary("item", "items", DateTime.UtcNow, "owner"); await db.SaveChangesAsync();
        }
        await using var read = new CatalogDbContext(database.Options);
        (await read.Collections.SingleAsync(c => c.Id == collection.Id)).ItemsLabel.Should().Be("items");
    }
}
