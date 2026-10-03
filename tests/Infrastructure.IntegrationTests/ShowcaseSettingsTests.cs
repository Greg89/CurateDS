using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class ShowcaseSettingsTests
{
    [Fact]
    public async Task Settings_ShouldUpgradeExistingCollectionsAndRoundTripBothLayoutsAndFlags()
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        var collection = Collection.Create("owner", "Reading room", DateTime.UtcNow, "owner", color: "clay");
        await using (var db = new CatalogDbContext(database.Options))
        {
            var legacyId = Guid.NewGuid();
            if (database.IsPostgres)
            {
                await db.GetService<IMigrator>().MigrateAsync("20261003140936_AddCollectionVocabulary");
                await db.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO collections ("Id", "OwnerId", "Name", "CreatedUtc", "CreatedBy")
                    VALUES ({legacyId}, {"owner"}, {"Old collection"}, {DateTime.UtcNow}, {"owner"})
                    """);
            }
            await database.InitializeAsync(db);
            if (database.IsPostgres)
            {
                var legacy = await db.Collections.SingleAsync(c => c.Id == legacyId);
                legacy.ShowcaseLayout.Should().Be("gallery"); legacy.ShowcaseShowGrowth.Should().BeFalse(); legacy.ShowcaseShowTypes.Should().BeFalse();
            }
            collection.UpdateVocabulary("book", "books", DateTime.UtcNow, "owner");
            collection.UpdatePresentation(false, true, false, true, [], DateTime.UtcNow, "owner");
            collection.UpdateShowcaseSettings("journal", true, true, DateTime.UtcNow, "owner");
            db.Collections.Add(collection); await db.SaveChangesAsync();
        }
        await using (var db = new CatalogDbContext(database.Options))
        {
            var saved = await db.Collections.SingleAsync(c => c.Id == collection.Id);
            saved.ShowcaseLayout.Should().Be("journal"); saved.ShowcaseShowGrowth.Should().BeTrue(); saved.ShowcaseShowTypes.Should().BeTrue();
            saved.ShowCover.Should().BeFalse(); saved.ItemsLabel.Should().Be("books"); saved.Color.Should().Be("clay");
            saved.UpdateShowcaseSettings("gallery", false, false, DateTime.UtcNow, "owner"); await db.SaveChangesAsync();
        }
        await using var read = new CatalogDbContext(database.Options);
        var restored = await read.Collections.SingleAsync(c => c.Id == collection.Id);
        restored.ShowcaseLayout.Should().Be("gallery"); restored.ShowcaseShowGrowth.Should().BeFalse(); restored.ShowcaseShowTypes.Should().BeFalse();
    }
}
