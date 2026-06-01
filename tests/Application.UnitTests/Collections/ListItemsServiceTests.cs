using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class ListItemsServiceTests
{
    private static readonly Guid CollectionId = Guid.NewGuid();
    private const string OwnerId = "auth0|test-owner";

    private static ListItemsQuery BuildQuery() =>
        new(OwnerId, CollectionId, null, null, [], [], null, null, 1, 20);

    private static ItemSummaryProjection BuildProjection(string? primaryImageStorageKey) =>
        new(Guid.NewGuid(), CollectionId, "Item", null, 1, null, null, [], 0, DateTime.UtcNow, null, primaryImageStorageKey);

    [Fact]
    public async Task ExecuteAsync_ShouldRemapStorageKeyToPublicUrl()
    {
        const string storageKey = "prod/collections/abc/items/def/image.jpg";
        const string expectedUrl = "https://cdn.example.com/bucket/prod/collections/abc/items/def/image.jpg";

        var collection = Collection.Create(OwnerId, "My Collection", DateTime.UtcNow, "system");
        var service = new ListItemsService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(BuildProjection(storageKey)),
            new FakeMediaStorageService());

        var result = await service.ExecuteAsync(BuildQuery() with { CollectionId = collection.Id }, CancellationToken.None);

        result.Items.Single().PrimaryImageUrl.Should().Be(expectedUrl);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldLeaveNullPrimaryImageUrl_AsNull()
    {
        var collection = Collection.Create(OwnerId, "My Collection", DateTime.UtcNow, "system");
        var service = new ListItemsService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(BuildProjection(null)),
            new FakeMediaStorageService());

        var result = await service.ExecuteAsync(BuildQuery() with { CollectionId = collection.Id }, CancellationToken.None);

        result.Items.Single().PrimaryImageUrl.Should().BeNull();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowNotFoundException_WhenCollectionNotFound()
    {
        var service = new ListItemsService(
            new FakeCollectionRepository(),
            new FakeItemRepository(),
            new FakeMediaStorageService());

        var act = () => service.ExecuteAsync(BuildQuery(), CancellationToken.None);

        await act.Should().ThrowAsync<CurateDS.Application.Common.NotFoundException>();
    }

    private sealed class FakeCollectionRepository : ICollectionRepository
    {
        private readonly List<Collection> _collections;

        public FakeCollectionRepository(params Collection[] collections)
            => _collections = collections.ToList();

        public Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult(_collections.SingleOrDefault(c => c.Id == collectionId && c.OwnerId == ownerId));

        public Task AddAsync(Collection collection, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<IReadOnlyList<Collection>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Collection>>([]);
        public Task<bool> SoftDeleteAsync(Guid collectionId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);
        public Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();
        public Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();
    }

    private sealed class FakeItemRepository : IItemRepository
    {
        private readonly ItemSummaryProjection[] _items;

        public FakeItemRepository(params ItemSummaryProjection[] items) => _items = items;

        public Task<PagedResult<ItemSummaryProjection>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken)
            => Task.FromResult(new PagedResult<ItemSummaryProjection>(_items, _items.Length, query.Page, query.PageSize));

        public Task AddAsync(Item item, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ReplaceAttributeValuesAsync(Guid itemId, IReadOnlyList<ItemAttributeValue> attributeValues, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task ReplaceTagsAsync(Guid itemId, IReadOnlyList<ItemTag> itemTags, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken) => Task.FromResult<Item?>(null);
        public Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Item>>([]);
        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public void AddMediaAsset(MediaAsset asset) { }
        public Task<bool> SoftDeleteAsync(Guid itemId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken) => Task.FromResult(false);
        public Task SoftDeleteByCollectionAsync(Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeMediaStorageService : IMediaStorageService
    {
        public string GetPublicUrl(string storageKey) => $"https://cdn.example.com/bucket/{storageKey}";

        public Task<string> UploadAsync(Guid collectionId, Guid itemId, Stream content, string contentType, string fileExtension, CancellationToken cancellationToken)
            => throw new NotImplementedException();

        public Task DeleteAsync(string storageKey, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
