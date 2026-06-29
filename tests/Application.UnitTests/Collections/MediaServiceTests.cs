using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.DeleteItemMedia;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Collections.SetPrimaryItemMedia;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class DeleteItemMediaServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRemoveAssetAndDeleteFromStorage()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var asset = MediaAsset.Create(item.Id, collection.Id, "beta/key.jpg", "image/jpeg", "cover.jpg", 1024, DateTime.UtcNow);
        item.AddMedia(asset);

        var itemRepository = new FakeItemRepository(item);
        var storageService = new FakeMediaStorageService();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteItemMediaService(
            new FakeCollectionRepository(collection),
            itemRepository,
            unitOfWork,
            storageService);

        await service.ExecuteAsync(
            new DeleteItemMediaCommand(collection.OwnerId, collection.Id, item.Id, asset.Id),
            CancellationToken.None);

        item.MediaAssets.Should().BeEmpty();
        storageService.DeletedKeys.Should().Contain("beta/key.jpg");
        itemRepository.SaveChangesCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldPromoteOldestAsset_WhenPrimaryIsDeleted()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var baseTime = DateTime.UtcNow;
        var first = MediaAsset.Create(item.Id, collection.Id, "key/first.jpg", "image/jpeg", "first.jpg", 1024, baseTime);
        var second = MediaAsset.Create(item.Id, collection.Id, "key/second.jpg", "image/jpeg", "second.jpg", 1024, baseTime.AddSeconds(1));
        item.AddMedia(first);
        item.AddMedia(second);

        var service = new DeleteItemMediaService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(item),
            new FakeCatalogUnitOfWork(),
            new FakeMediaStorageService());

        await service.ExecuteAsync(
            new DeleteItemMediaCommand(collection.OwnerId, collection.Id, item.Id, first.Id),
            CancellationToken.None);

        item.MediaAssets.Should().HaveCount(1);
        second.IsPrimary.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionNotFound()
    {
        var service = new DeleteItemMediaService(
            new FakeCollectionRepository(),
            new FakeItemRepository(),
            new FakeCatalogUnitOfWork(),
            new FakeMediaStorageService());

        var act = () => service.ExecuteAsync(
            new DeleteItemMediaCommand("auth0|test-owner", Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenItemNotFound()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var service = new DeleteItemMediaService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(),
            new FakeCatalogUnitOfWork(),
            new FakeMediaStorageService());

        var act = () => service.ExecuteAsync(
            new DeleteItemMediaCommand(collection.OwnerId, collection.Id, Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenAssetNotFoundOnItem()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var service = new DeleteItemMediaService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(item),
            new FakeCatalogUnitOfWork(),
            new FakeMediaStorageService());

        var act = () => service.ExecuteAsync(
            new DeleteItemMediaCommand(collection.OwnerId, collection.Id, item.Id, Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    private sealed class FakeMediaStorageService : IMediaStorageService
    {
        public List<string> DeletedKeys { get; } = [];

        public Task<string> UploadAsync(Guid collectionId, Guid itemId, Stream content, string contentType, string fileExtension, CancellationToken cancellationToken)
            => Task.FromResult("test/key.jpg");

        public Task DeleteAsync(string storageKey, CancellationToken cancellationToken)
        {
            DeletedKeys.Add(storageKey);
            return Task.CompletedTask;
        }

        public string GetPublicUrl(string storageKey) => $"https://cdn.example.com/{storageKey}";
    }

    private sealed class FakeCollectionRepository : ICollectionRepository
    {
        private readonly List<Collection> _collections;

        public FakeCollectionRepository(params Collection[] collections)
        {
            _collections = collections.ToList();
        }

        public Task AddAsync(Collection collection, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<Collection?> GetByIdAndOwnerAsync(Guid id, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult(_collections.SingleOrDefault(c => c.Id == id && c.OwnerId == ownerId));

        public Task<IReadOnlyList<Collection>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Collection>>([]);

        public Task<bool> SoftDeleteAsync(Guid id, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();

        public Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();
    }

    private sealed class FakeItemRepository : IItemRepository
    {
        private readonly List<Item> _items;

        public FakeItemRepository(params Item[] items)
        {
            _items = items.ToList();
        }

        public int SaveChangesCallCount { get; private set; }

        public Task AddAsync(Item item, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task ReplaceAttributeValuesAsync(Guid itemId, IReadOnlyList<ItemAttributeValue> attributeValues, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task ReplaceTagsAsync(Guid itemId, IReadOnlyList<ItemTag> itemTags, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(_items.SingleOrDefault(i => i.Id == itemId && i.CollectionId == collectionId));

        public Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Item>>([]);

        public void AddMediaAsset(MediaAsset asset) { }

        public Task<bool> SoftDeleteAsync(Guid itemId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SoftDeleteByCollectionAsync(Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<PagedResult<ItemSummaryProjection>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken)
            => Task.FromResult(new PagedResult<ItemSummaryProjection>([], 0, 1, 50));
    }
}

public sealed class SetPrimaryItemMediaServiceTests
{
    [Fact]
    public async Task ExecuteAsync_ShouldSetPrimaryFlag()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var first = MediaAsset.Create(item.Id, collection.Id, "key/first.jpg", "image/jpeg", "first.jpg", 1024, DateTime.UtcNow);
        var second = MediaAsset.Create(item.Id, collection.Id, "key/second.jpg", "image/jpeg", "second.jpg", 1024, DateTime.UtcNow.AddSeconds(1));
        item.AddMedia(first);
        item.AddMedia(second);

        var itemRepository = new FakeSPItemRepository(item);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new SetPrimaryItemMediaService(
            new FakeSPCollectionRepository(collection),
            itemRepository,
            unitOfWork);

        await service.ExecuteAsync(
            new SetPrimaryItemMediaCommand(collection.OwnerId, collection.Id, item.Id, second.Id),
            CancellationToken.None);

        first.IsPrimary.Should().BeFalse();
        second.IsPrimary.Should().BeTrue();
        itemRepository.SaveChangesCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenAssetNotFoundOnItem()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var service = new SetPrimaryItemMediaService(
            new FakeSPCollectionRepository(collection),
            new FakeSPItemRepository(item),
            new FakeCatalogUnitOfWork());

        var act = () => service.ExecuteAsync(
            new SetPrimaryItemMediaCommand(collection.OwnerId, collection.Id, item.Id, Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenItemNotFound()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var service = new SetPrimaryItemMediaService(
            new FakeSPCollectionRepository(collection),
            new FakeSPItemRepository(),
            new FakeCatalogUnitOfWork());

        var act = () => service.ExecuteAsync(
            new SetPrimaryItemMediaCommand(collection.OwnerId, collection.Id, Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    private sealed class FakeSPCollectionRepository : ICollectionRepository
    {
        private readonly List<Collection> _collections;

        public FakeSPCollectionRepository(params Collection[] collections)
        {
            _collections = collections.ToList();
        }

        public Task AddAsync(Collection collection, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<Collection?> GetByIdAndOwnerAsync(Guid id, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult(_collections.SingleOrDefault(c => c.Id == id && c.OwnerId == ownerId));

        public Task<IReadOnlyList<Collection>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Collection>>([]);

        public Task<bool> SoftDeleteAsync(Guid id, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();

        public Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();
    }

    private sealed class FakeSPItemRepository : IItemRepository
    {
        private readonly List<Item> _items;

        public FakeSPItemRepository(params Item[] items)
        {
            _items = items.ToList();
        }

        public int SaveChangesCallCount { get; private set; }

        public Task AddAsync(Item item, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task ReplaceAttributeValuesAsync(Guid itemId, IReadOnlyList<ItemAttributeValue> attributeValues, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task ReplaceTagsAsync(Guid itemId, IReadOnlyList<ItemTag> itemTags, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(_items.SingleOrDefault(i => i.Id == itemId && i.CollectionId == collectionId));

        public Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Item>>([]);

        public void AddMediaAsset(MediaAsset asset) { }

        public Task<bool> SoftDeleteAsync(Guid itemId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SoftDeleteByCollectionAsync(Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<PagedResult<ItemSummaryProjection>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken)
            => Task.FromResult(new PagedResult<ItemSummaryProjection>([], 0, 1, 50));
    }
}
