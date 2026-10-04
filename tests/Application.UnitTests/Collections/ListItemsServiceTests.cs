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

    private static ItemSummaryProjection BuildProjection(Guid? primaryImageAssetId) =>
        new(Guid.NewGuid(), CollectionId, "Item", null, 1, null, null, [], 0, DateTime.UtcNow, null, primaryImageAssetId);

    [Fact]
    public async Task ExecuteAsync_ShouldReturnScopedMediaPath()
    {
        var projection = BuildProjection(Guid.NewGuid());

        var collection = Collection.Create(OwnerId, "My Collection", DateTime.UtcNow, "system");
        var service = new ListItemsService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(projection));

        var result = await service.ExecuteAsync(BuildQuery() with { CollectionId = collection.Id }, CancellationToken.None);

        result.Items.Single().PrimaryImageUrl.Should().Be(MediaContentPath.For(projection.CollectionId, projection.Id, projection.PrimaryImageAssetId!.Value));
    }

    [Fact]
    public async Task ExecuteAsync_ShouldLeaveNullPrimaryImageUrl_AsNull()
    {
        var collection = Collection.Create(OwnerId, "My Collection", DateTime.UtcNow, "system");
        var service = new ListItemsService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(BuildProjection(null)));

        var result = await service.ExecuteAsync(BuildQuery() with { CollectionId = collection.Id }, CancellationToken.None);

        result.Items.Single().PrimaryImageUrl.Should().BeNull();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowNotFoundException_WhenCollectionNotFound()
    {
        var service = new ListItemsService(
            new FakeCollectionRepository(),
            new FakeItemRepository());

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
        public void AddMediaAsset(MediaAsset asset) { }
        public Task<bool> SoftDeleteAsync(Guid itemId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken) => Task.FromResult(false);
        public Task SoftDeleteByCollectionAsync(Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeMediaStorageService : IMediaStorageService
    {
        public Task<byte[]?> ReadAsync(string key, long maximumBytes, CancellationToken ct) => throw new NotSupportedException();

        public Task<string> UploadAsync(Guid collectionId, Guid itemId, Stream content, string contentType, string fileExtension, CancellationToken cancellationToken)
            => throw new NotImplementedException();

        public Task DeleteAsync(string storageKey, CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
