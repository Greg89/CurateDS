using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.DeleteItemType;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class DeleteItemTypeServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSoftDeleteItemTypeInUnitOfWork()
    {
        var collection = Collection.Create("auth0|test-owner", "Equipment", DateTime.UtcNow, "system");
        var itemType = ItemType.Create(collection.Id, "Machine", 0, DateTime.UtcNow, "system");
        var itemTypeRepository = new TrackingItemTypeRepository(itemType);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteItemTypeService(
            new FakeCollectionRepository(collection),
            itemTypeRepository,
            unitOfWork,
            new FakeCurrentUserService());

        await service.ExecuteAsync(
            new DeleteItemTypeCommand(collection.OwnerId, collection.Id, itemType.Id),
            CancellationToken.None);

        itemTypeRepository.SoftDeleteCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenItemTypeDoesNotExist()
    {
        var collection = Collection.Create("auth0|test-owner", "Equipment", DateTime.UtcNow, "system");
        var itemTypeRepository = new TrackingItemTypeRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteItemTypeService(
            new FakeCollectionRepository(collection),
            itemTypeRepository,
            unitOfWork,
            new FakeCurrentUserService());

        var act = () => service.ExecuteAsync(
            new DeleteItemTypeCommand(collection.OwnerId, collection.Id, Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        itemTypeRepository.SoftDeleteCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var itemTypeRepository = new TrackingItemTypeRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteItemTypeService(
            new FakeCollectionRepository(),
            itemTypeRepository,
            unitOfWork,
            new FakeCurrentUserService());

        var act = () => service.ExecuteAsync(
            new DeleteItemTypeCommand("auth0|test-owner", Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        itemTypeRepository.SoftDeleteCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(0);
    }

    private sealed class FakeCollectionRepository : ICollectionRepository
    {
        private readonly List<Collection> _collections;

        public FakeCollectionRepository(params Collection[] collections)
        {
            _collections = collections.ToList();
        }

        public Task AddAsync(Collection collection, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult(_collections.SingleOrDefault(collection =>
                collection.Id == collectionId && collection.OwnerId == ownerId));

        public Task<IReadOnlyList<Collection>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Collection>>([]);

        public Task<bool> SoftDeleteAsync(Guid collectionId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();

        public Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();
    }

    private sealed class TrackingItemTypeRepository : IItemTypeRepository
    {
        private readonly List<ItemType> _itemTypes;

        public TrackingItemTypeRepository(params ItemType[] itemTypes)
        {
            _itemTypes = itemTypes.ToList();
        }

        public int SoftDeleteCallCount { get; private set; }

        public Task AddAsync(ItemType itemType, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(0);

        public Task<ItemType?> GetByIdAndCollectionAsync(Guid itemTypeId, Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(_itemTypes.SingleOrDefault(itemType => itemType.Id == itemTypeId && itemType.CollectionId == collectionId));

        public Task<IReadOnlyList<ItemType>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<ItemType>>(_itemTypes.Where(itemType => itemType.CollectionId == collectionId).ToArray());

        public Task<bool> SoftDeleteAsync(Guid itemTypeId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
        {
            SoftDeleteCallCount++;
            return Task.FromResult(_itemTypes.Any(itemType => itemType.Id == itemTypeId && itemType.CollectionId == collectionId));
        }
    }
}
