using System.Data.Common;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Publications;
using CurateDS.Application.Common;
using CurateDS.Application.Collections.DeleteItem;
using CurateDS.Infrastructure.Persistence.Repositories;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using CurateDS.Infrastructure.Publications;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class PublicationPersistenceTests
{
    private const string Owner = "owner";
    private static PublicationService Service(CatalogDbContext db, Storage? storage = null, TimeProvider? clock = null) =>
        new(db, storage ?? new Storage(), storage ?? new Storage(), new PublicationImageProcessor(), clock ?? TimeProvider.System);
    private static async Task<Collection> Seed(TransactionTestDatabase database)
    {
        await using var db = new CatalogDbContext(database.Options); await database.InitializeAsync(db);
        var collection = Collection.Create(Owner, "Frozen collection", DateTime.UtcNow, Owner);
        db.Collections.Add(collection); await db.SaveChangesAsync(); return collection;
    }
    [Fact]
    public async Task Migration_DefaultsToNoPublicationAndRetainsSourceData()
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        await using var db = new CatalogDbContext(database.Options);
        if (database.IsPostgres)
        {
            await db.GetService<IMigrator>().MigrateAsync("20261003190840_AddShowcaseSettings");
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO collections (\"Id\", \"OwnerId\", \"Name\", \"CreatedUtc\", \"CreatedBy\") VALUES ({Guid.NewGuid()}, {Owner}, {"Old collection"}, {DateTime.UtcNow}, {Owner})");
        }
        await database.InitializeAsync(db);
        (await db.Publications.CountAsync()).Should().Be(0); (await db.ShowcaseEditions.CountAsync()).Should().Be(0);
        if (database.IsPostgres) (await db.Collections.SingleAsync()).Name.Should().Be("Old collection");
    }
    [Fact]
    public async Task Slugs_AreUniqueAndReservedAfterSourceDeletion()
    {
        await using var database = await TransactionTestDatabase.OpenAsync(); var collection = await Seed(database);
        await using (var db = new CatalogDbContext(database.Options))
        {
            var service = Service(db); var preview = await service.PrepareAsync(Owner, collection.Id, new("frozen-room", true), default);
            await service.PublishAsync(Owner, collection.Id, new(preview.Token, preview.Generation), default);
            await new EfCatalogUnitOfWork(db).ExecuteInTransactionAsync(async ct =>
            {
                await new EfCatalogUnitOfWork(db).SuspendPublicationAsync(collection.Id, "collection_deleted", ct);
                (await db.Collections.SingleAsync()).SoftDelete(DateTime.UtcNow, Owner);
            }, default);
            var missing = () => service.PublicAsync("frozen-room", null, default); await missing.Should().ThrowAsync<NotFoundException>();
        }
        var other = await Seed(database);
        await using var competitor = new CatalogDbContext(database.Options); var otherService = Service(competitor);
        var candidate = await otherService.PrepareAsync(Owner, other.Id, new("frozen-room", true), default);
        var conflict = () => otherService.PublishAsync(Owner, other.Id, new(candidate.Token, candidate.Generation), default);
        await conflict.Should().ThrowAsync<PublicationConflictException>();
        await using var verify = new CatalogDbContext(database.Options);
        (await verify.Publications.SingleAsync(p => p.CollectionId == collection.Id)).Slug.Should().Be("frozen-room");
        (await verify.Publications.SingleAsync(p => p.CollectionId == other.Id)).ActiveEditionId.Should().BeNull();
    }
    [Fact]
    public async Task Cleanup_RetriesFailedObjectDeletionAndNeverRemovesActiveEdition()
    {
        await using var database = await TransactionTestDatabase.OpenAsync(); var collection = await Seed(database);
        var time = new Clock(DateTimeOffset.UtcNow); var storage = new Storage();
        await using var db = new CatalogDbContext(database.Options); var service = Service(db, storage, time);
        var active = await service.PrepareAsync(Owner, collection.Id, new("frozen-room", true), default);
        await service.PublishAsync(Owner, collection.Id, new(active.Token, active.Generation), default);
        var stale = await service.PrepareAsync(Owner, collection.Id, new("frozen-room", true), default);
        // An interrupted staging write leaves a durable key even if it never marked the candidate ready.
        var asset = new ShowcaseAsset(Guid.NewGuid(), stale.Token, "staged-object"); db.ShowcaseAssets.Add(asset); await db.SaveChangesAsync();
        storage.Objects[asset.StorageKey] = [1, 2, 3]; storage.FailDelete = true; time.Advance(TimeSpan.FromHours(2));
        var failed = () => service.CleanupAsync(default); await failed.Should().ThrowAsync<IOException>();
        db.ChangeTracker.Clear(); (await db.ShowcaseAssets.CountAsync()).Should().Be(1);
        storage.FailDelete = false; (await service.CleanupAsync(default)).Should().Be(1);
        (await db.ShowcaseAssets.CountAsync()).Should().Be(0);
        (await service.PublicAsync("frozen-room", null, default)).RevisionToken.Should().Be(active.Token);
    }

    [Theory]
    [InlineData(false)] [InlineData(true)]
    public async Task Postgres_PublishWaitsForRevocationAndCannotReactivate(bool deleteSource)
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("CURATEDS_TEST_POSTGRES"))) return;
        await using var database = await TransactionTestDatabase.OpenAsync(); var collection = await Seed(database);
        var item = Item.Create(collection.Id, "Source item", null, 1, DateTime.UtcNow, Owner);
        PublicationPreview pending;
        await using (var seed = new CatalogDbContext(database.Options))
        {
            seed.Items.Add(item); await seed.SaveChangesAsync();
            var service = Service(seed); var first = await service.PrepareAsync(Owner, collection.Id, new("frozen-room", true), default);
            await service.PublishAsync(Owner, collection.Id, new(first.Token, first.Generation), default);
            pending = await service.PrepareAsync(Owner, collection.Id, new("frozen-room", true), default);
        }
        var pause = new PauseAfterLock();
        var options = new DbContextOptionsBuilder<CatalogDbContext>(database.Options).AddInterceptors(pause).Options;
        await using var revoking = new CatalogDbContext(options); await using var publishing = new CatalogDbContext(database.Options);
        var mutation = deleteSource ? new DeleteItemService(new CollectionRepository(revoking), new ItemRepository(revoking),
            new ItemEventRepository(revoking), new EfCatalogUnitOfWork(revoking), new User())
            .ExecuteAsync(new DeleteItemCommand(Owner, collection.Id, item.Id), default)
            : (Task)Service(revoking).UnpublishAsync(Owner, collection.Id, default);
        await pause.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var publish = Service(publishing).PublishAsync(Owner, collection.Id, new(pending.Token, pending.Generation), default);
        try { await Task.Delay(150); publish.IsCompleted.Should().BeFalse("the source/publication lock is still held"); }
        finally { pause.Release.TrySetResult(); }
        await mutation;
        var result = () => publish; await result.Should().ThrowAsync<PublicationConflictException>();
        await using var verify = new CatalogDbContext(database.Options);
        (await verify.Publications.SingleAsync()).ActiveEditionId.Should().BeNull();
    }
    [Fact]
    public async Task Postgres_ConcurrentSlugClaimsHaveExactlyOneWinner()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("CURATEDS_TEST_POSTGRES"))) return;
        await using var database = await TransactionTestDatabase.OpenAsync(); var first = await Seed(database); var second = await Seed(database);
        await using var left = new CatalogDbContext(database.Options); await using var right = new CatalogDbContext(database.Options);
        var l = Service(left); var r = Service(right);
        var lp = await l.PrepareAsync(Owner, first.Id, new("same-slug", true), default);
        var rp = await r.PrepareAsync(Owner, second.Id, new("same-slug", true), default);
        static async Task<bool> Attempt(PublicationService service, Guid id, PublicationPreview preview)
        {
            try { await service.PublishAsync(Owner, id, new(preview.Token, preview.Generation), default); return true; }
            catch (PublicationConflictException) { return false; }
        }
        var winners = await Task.WhenAll(Attempt(l, first.Id, lp), Attempt(r, second.Id, rp)); winners.Count(x => x).Should().Be(1);
    }
    [Fact]
    public async Task Snapshot_BoundsReportsAndCardsAndRejectsExpiredReviews()
    {
        await using var database = await TransactionTestDatabase.OpenAsync(); var collection = await Seed(database);
        var time = new Clock(DateTimeOffset.UtcNow);
        await using var db = new CatalogDbContext(database.Options);
        var saved = await db.Collections.SingleAsync();
        saved.UpdateShowcaseSettings("journal", true, true, DateTime.UtcNow, Owner);
        var items = new List<Item>();
        for (var index = 0; index < 20; index++)
        {
            var type = ItemType.Create(collection.Id, $"Type {index:D2}", index, DateTime.UtcNow, Owner);
            db.ItemTypes.Add(type);
            var item = Item.Create(Guid.NewGuid(), collection.Id, $"Item {index:D2}", "Public story", 1, null,
                type.Id, [], [], time.GetUtcNow().UtcDateTime.AddMinutes(-index), Owner);
            items.Add(item); db.Items.Add(item);
        }
        saved.UpdatePresentation(true, true, true, true, items.Take(6).Select(i => i.Id).ToArray(), DateTime.UtcNow, Owner);
        await db.SaveChangesAsync(); var service = Service(db, clock: time);
        var candidate = await service.PrepareAsync(Owner, collection.Id, new("frozen-room", true), default);
        candidate.Showcase.Highlights.Should().HaveCount(6); candidate.Showcase.Recent.Should().HaveCount(6);
        candidate.Showcase.Highlights!.Select(i => i.Name).Intersect(candidate.Showcase.Recent!.Select(i => i.Name)).Should().BeEmpty();
        candidate.Showcase.Types!.TotalGroups.Should().Be(20); candidate.Showcase.Types.Groups.Should().HaveCount(6);
        candidate.Showcase.Types.Groups.Select(g => g.Name).Should().Equal(Enumerable.Range(0, 6).Select(i => $"Type {i:D2}"));
        candidate.Showcase.Summary!.TotalItems.Should().Be(20); candidate.Showcase.Growth.Should().HaveCount(12);
        time.Advance(TimeSpan.FromMinutes(31));
        var publish = () => service.PublishAsync(Owner, collection.Id, new(candidate.Token, candidate.Generation), default);
        await publish.Should().ThrowAsync<PublicationConflictException>();
        var review = () => service.PreviewAsync(Owner, collection.Id, candidate.Token, default);
        await review.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task FailedStagedImage_CannotReplaceActiveEdition_AndRemovedSourcesInvalidatePreparation()
    {
        await using var database = await TransactionTestDatabase.OpenAsync(); var collection = await Seed(database);
        var storage = new Storage();
        using var bitmap = new SkiaSharp.SKBitmap(2, 2); bitmap.Erase(SkiaSharp.SKColors.Blue);
        using var image = SkiaSharp.SKImage.FromBitmap(bitmap); using var encoded = image.Encode(SkiaSharp.SKEncodedImageFormat.Png, 100);
        var bytes = encoded.ToArray(); storage.Objects["private-original"] = bytes;
        await using var db = new CatalogDbContext(database.Options);
        var item = Item.Create(collection.Id, "Private photograph", null, 1, DateTime.UtcNow, Owner);
        item.AddMedia(MediaAsset.Create(item.Id, collection.Id, "private-original", "image/png", "PRIVATE_FILE.png", bytes.Length, DateTime.UtcNow));
        db.Items.Add(item); await db.SaveChangesAsync(); var service = Service(db, storage);
        var first = await service.PrepareAsync(Owner, collection.Id, new("frozen-room"), default);
        await service.PublishAsync(Owner, collection.Id, new(first.Token, first.Generation), default);
        var asset = first.Showcase.Recent!.Single().ImageToken!.Value;
        (await service.PublicImageAsync("frozen-room", first.Token, asset, default)).ContentType.Should().Be("image/jpeg");
        var next = await service.PrepareAsync(Owner, collection.Id, new("frozen-room"), default);
        storage.Objects.Remove(storage.Key(next.Token, next.Showcase.Recent!.Single().ImageToken!.Value));
        var failed = () => service.PublishAsync(Owner, collection.Id, new(next.Token, next.Generation), default);
        await failed.Should().ThrowAsync<PublicationMediaException>();
        (await service.PublicAsync("frozen-room", null, default)).RevisionToken.Should().Be(first.Token);
        storage.AfterWrite = async () =>
        {
            await using var deleting = new CatalogDbContext(database.Options);
            await new DeleteItemService(new CollectionRepository(deleting), new ItemRepository(deleting),
                new ItemEventRepository(deleting), new EfCatalogUnitOfWork(deleting), new User())
                .ExecuteAsync(new(Owner, collection.Id, item.Id), default);
        };
        // This happens after the consistent snapshot and before MarkReady, outside any preparation transaction.
        var interrupted = () => service.PrepareAsync(Owner, collection.Id, new("frozen-room"), default);
        await interrupted.Should().ThrowAsync<PublicationConflictException>();
        var gone = () => service.PublicAsync("frozen-room", null, default); await gone.Should().ThrowAsync<NotFoundException>();
    }
    private sealed class PauseAfterLock : DbCommandInterceptor
    {
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<int> NonQueryExecutedAsync(DbCommand command, CommandExecutedEventData eventData, int result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("FOR UPDATE", StringComparison.Ordinal))
            { Entered.TrySetResult(); await Release.Task.WaitAsync(cancellationToken); }
            return result;
        }
    }
    private sealed class Clock(DateTimeOffset value) : TimeProvider
    {
        private DateTimeOffset current = value;
        public override DateTimeOffset GetUtcNow() => current;
        public void Advance(TimeSpan time) => current += time;
    }
    private sealed class User : ICurrentUserService { public string GetCurrentUser() => Owner; }
    private sealed class Storage : IMediaStorageService, IPublicationStorage
    {
        public Dictionary<string, byte[]> Objects { get; } = [];
        public bool FailDelete;
        public Func<Task>? AfterWrite;
        public string Key(Guid revision, Guid asset) => $"showcases/{revision}/{asset}";
        public async Task WriteAsync(string key, byte[] bytes, CancellationToken ct) { Objects[key] = bytes; if (AfterWrite is not null) await AfterWrite(); }
        public Task<byte[]?> ReadAsync(string key, long maximumBytes, CancellationToken ct) => Task.FromResult(Objects.GetValueOrDefault(key));
        public Task DeleteAsync(string key, CancellationToken ct)
        { if (FailDelete) throw new IOException(); Objects.Remove(key); return Task.CompletedTask; }
        public Task<string> UploadAsync(Guid collectionId, Guid itemId, Stream content, string contentType, string extension, CancellationToken ct) => throw new NotSupportedException();
    }
}
