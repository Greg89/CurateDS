using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.CollectionPresentation;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using CurateDS.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class CollectionPresentationTests
{
    [Fact]
    public async Task Presentation_ShouldRoundTripFlagsAndOrderAndOmitDeletedItems()
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        var collection = Collection.Create("owner", "Test pins", DateTime.UtcNow, "owner");
        var one = Item.Create(collection.Id, "First item", null, 1, DateTime.UtcNow, "owner");
        var two = Item.Create(collection.Id, "Second item", null, 1, DateTime.UtcNow, "owner");
        var foreignCollection = Collection.Create("other", "Other collection", DateTime.UtcNow, "other");
        var foreign = Item.Create(foreignCollection.Id, "Foreign item", null, 1, DateTime.UtcNow, "other");
        await using (var db = new CatalogDbContext(database.Options))
        {
            var legacyId = Guid.NewGuid();
            if (database.IsPostgres)
            {
                await db.GetService<IMigrator>().MigrateAsync("20261003003520_AddCollectionIdentity");
                await db.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO collections ("Id", "OwnerId", "Name", "CreatedUtc", "CreatedBy")
                    VALUES ({legacyId}, {"owner"}, {"Before presentation migration"}, {DateTime.UtcNow}, {"owner"})
                    """);
            }
            await database.InitializeAsync(db);
            if (database.IsPostgres)
            {
                var legacy = await db.Collections.SingleAsync(value => value.Id == legacyId);
                legacy.ShowCover.Should().BeTrue();
                legacy.ShowSummary.Should().BeTrue();
                legacy.ShowPinnedItems.Should().BeTrue();
                legacy.ShowRecentItems.Should().BeTrue();
                legacy.PinnedItemIds.Should().BeEmpty();
            }
            db.Collections.AddRange(collection, foreignCollection);
            db.Items.AddRange(one, two, foreign);
            one.MediaAssets.Add(MediaAsset.Create(one.Id, collection.Id, "primary.jpg", "image/jpeg", "cover.jpg", 10, DateTime.UtcNow));
            await db.SaveChangesAsync();
            var service = Service(db);
            var defaults = await service.GetAsync("owner", collection.Id, default);
            defaults.ShowCover.Should().BeTrue();
            defaults.ShowSummary.Should().BeTrue();
            defaults.ShowPinnedItems.Should().BeTrue();
            defaults.ShowRecentItems.Should().BeTrue();
            defaults.PinnedItems.Should().BeEmpty();
            await service.UpdateAsync(new("owner", collection.Id, false, false, false, false, [two.Id, one.Id]), default);
        }
        await using (var db = new CatalogDbContext(database.Options))
        {
            var service = Service(db);
            var saved = await service.GetAsync("owner", collection.Id, default);
            saved.ShowCover.Should().BeFalse();
            saved.ShowSummary.Should().BeFalse();
            saved.ShowPinnedItems.Should().BeFalse();
            saved.ShowRecentItems.Should().BeFalse();
            saved.PinnedItems.Select(item => item.Id).Should().Equal(two.Id, one.Id);
            saved.PinnedItems[1].PrimaryImageUrl.Should().Be("https://images.test/primary.jpg");
            Func<Task> invalid = () => service.UpdateAsync(new("owner", collection.Id, true, true, true, true, [foreign.Id]), default);
            await invalid.Should().ThrowAsync<FluentValidation.ValidationException>();
            (await service.GetAsync("owner", collection.Id, default)).ShowCover.Should().BeFalse();
            var removed = await db.Items.SingleAsync(item => item.Id == two.Id);
            removed.SoftDelete(DateTime.UtcNow, "owner");
            await db.SaveChangesAsync();
        }
        await using (var db = new CatalogDbContext(database.Options))
        {
            var result = await Service(db).GetAsync("owner", collection.Id, default);
            result.PinnedItems.Should().ContainSingle().Which.Id.Should().Be(one.Id);
            await Service(db).UpdateAsync(new("owner", collection.Id, true, false, true, false, []), default);
        }
        await using (var db = new CatalogDbContext(database.Options))
        {
            var result = await Service(db).GetAsync("owner", collection.Id, default);
            result.PinnedItems.Should().BeEmpty();
            result.ShowCover.Should().BeTrue();
            result.ShowSummary.Should().BeFalse();
        }
    }

    private static CollectionPresentationService Service(CatalogDbContext db) => new(
        new CollectionRepository(db), new CollectionPresentationRepository(db), new EfCatalogUnitOfWork(db),
        new User(), new Media(), new UpdateCollectionPresentationValidator());
    private sealed class User : ICurrentUserService { public string GetCurrentUser() => "owner"; }
    private sealed class Media : IMediaStorageService
    {
        public string GetPublicUrl(string key) => "https://images.test/" + key;
        public Task DeleteAsync(string key, CancellationToken ct) => throw new NotSupportedException();
        public Task<string> UploadAsync(Guid collectionId, Guid itemId, Stream content, string contentType,
            string extension, CancellationToken ct) => throw new NotSupportedException();
    }
}
