using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Collections.UploadItemMedia;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class UploadItemMediaServiceTests
{
    [Fact]
    public async Task ExecuteAsync_ShouldUploadAndAddMedia_WhenValidImageProvided()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var itemRepository = new FakeItemRepository(item);
        var storageService = new FakeMediaStorageService();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new UploadItemMediaService(
            new FakeCollectionRepository(collection),
            itemRepository,
            unitOfWork,
            storageService);

        using var stream = new MemoryStream(new byte[1024]);
        var result = await service.ExecuteAsync(
            new UploadItemMediaCommand(
                collection.OwnerId,
                collection.Id,
                item.Id,
                stream,
                "image/jpeg",
                "cover.jpg",
                1024),
            CancellationToken.None);

        result.ContentType.Should().Be("image/jpeg");
        result.FileName.Should().Be("cover.jpg");
        result.IsPrimary.Should().BeTrue();
        storageService.UploadedKeys.Should().HaveCount(1);
        storageService.DeletedKeys.Should().BeEmpty();
        itemRepository.SaveChangesCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(1);
        item.MediaAssets.Should().HaveCount(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldDeleteUploadedObject_WhenDatabaseCommitFails()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var storageService = new FakeMediaStorageService();
        var unitOfWork = new FakeCatalogUnitOfWork
        {
            ExceptionToThrowAfterOperation = new InvalidOperationException("Database commit failed.")
        };
        var service = new UploadItemMediaService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(item),
            unitOfWork,
            storageService);

        using var stream = new MemoryStream(new byte[1024]);
        var act = () => service.ExecuteAsync(
            new UploadItemMediaCommand(
                collection.OwnerId,
                collection.Id,
                item.Id,
                stream,
                "image/jpeg",
                "cover.jpg",
                1024),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database commit failed.");
        storageService.UploadedKeys.Should().ContainSingle();
        storageService.DeletedKeys.Should().Equal(storageService.UploadedKeys);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldMakeAssetPrimary_WhenFirstImageOnItem()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var service = new UploadItemMediaService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(item),
            new FakeCatalogUnitOfWork(),
            new FakeMediaStorageService());

        using var stream = new MemoryStream(new byte[512]);
        var result = await service.ExecuteAsync(
            new UploadItemMediaCommand(collection.OwnerId, collection.Id, item.Id, stream, "image/png", "art.png", 512),
            CancellationToken.None);

        result.IsPrimary.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenContentTypeIsNotAllowed()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var service = new UploadItemMediaService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(item),
            new FakeCatalogUnitOfWork(),
            new FakeMediaStorageService());

        using var stream = new MemoryStream(new byte[1024]);
        var act = () => service.ExecuteAsync(
            new UploadItemMediaCommand(collection.OwnerId, collection.Id, item.Id, stream, "application/pdf", "file.pdf", 1024),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenFileSizeExceedsLimit()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Kind of Blue", null, 1, DateTime.UtcNow, "system");
        var service = new UploadItemMediaService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(item),
            new FakeCatalogUnitOfWork(),
            new FakeMediaStorageService());

        var overLimit = UploadItemMediaService.MaxFileSizeBytes + 1;
        using var stream = new MemoryStream(new byte[1024]);
        var act = () => service.ExecuteAsync(
            new UploadItemMediaCommand(collection.OwnerId, collection.Id, item.Id, stream, "image/jpeg", "huge.jpg", overLimit),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionNotFound()
    {
        var service = new UploadItemMediaService(
            new FakeCollectionRepository(),
            new FakeItemRepository(),
            new FakeCatalogUnitOfWork(),
            new FakeMediaStorageService());

        using var stream = new MemoryStream(new byte[512]);
        var act = () => service.ExecuteAsync(
            new UploadItemMediaCommand("auth0|test-owner", Guid.NewGuid(), Guid.NewGuid(), stream, "image/jpeg", "img.jpg", 512),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenItemNotFound()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var service = new UploadItemMediaService(
            new FakeCollectionRepository(collection),
            new FakeItemRepository(),
            new FakeCatalogUnitOfWork(),
            new FakeMediaStorageService());

        using var stream = new MemoryStream(new byte[512]);
        var act = () => service.ExecuteAsync(
            new UploadItemMediaCommand(collection.OwnerId, collection.Id, Guid.NewGuid(), stream, "image/jpeg", "img.jpg", 512),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    private sealed class FakeMediaStorageService : IMediaStorageService
    {
        private int _callCount;

        public List<string> UploadedKeys { get; } = [];

        public List<string> DeletedKeys { get; } = [];

        public Task<string> UploadAsync(Guid collectionId, Guid itemId, Stream content, string contentType, string fileExtension, CancellationToken cancellationToken)
        {
            var key = $"beta/collections/{collectionId}/items/{itemId}/{++_callCount}.{fileExtension}";
            UploadedKeys.Add(key);
            return Task.FromResult(key);
        }

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
            => Task.FromResult<IReadOnlyList<Collection>>(_collections.Where(c => c.OwnerId == ownerId).ToArray());

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
            => Task.FromResult<IReadOnlyList<Item>>(_items.Where(i => i.CollectionId == collectionId).ToArray());

        public Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            SaveChangesCallCount++;
            return Task.CompletedTask;
        }

        public void AddMediaAsset(MediaAsset asset) { }

        public Task<bool> SoftDeleteAsync(Guid itemId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SoftDeleteByCollectionAsync(Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<PagedResult<ItemSummaryProjection>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken)
            => Task.FromResult(new PagedResult<ItemSummaryProjection>([], 0, 1, 50));
    }
}
