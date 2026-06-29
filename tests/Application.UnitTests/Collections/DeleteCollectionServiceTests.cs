using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.DeleteCollection;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class DeleteCollectionServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSoftDeleteCollectionAndItemsInUnitOfWork()
    {
        var collectionId = Guid.NewGuid();
        var ownerId = "auth0|test-owner";
        var collectionRepository = new FakeCollectionRepository(collectionId, ownerId);
        var itemRepository = new FakeItemRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteCollectionService(
            collectionRepository,
            itemRepository,
            unitOfWork,
            new FakeCurrentUserService());

        await service.ExecuteAsync(
            new DeleteCollectionCommand(ownerId, collectionId),
            CancellationToken.None);

        collectionRepository.SoftDeleteCallCount.Should().Be(1);
        itemRepository.SoftDeleteByCollectionCallCount.Should().Be(1);
        itemRepository.LastSoftDeletedCollectionId.Should().Be(collectionId);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var collectionRepository = new FakeCollectionRepository();
        var itemRepository = new FakeItemRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteCollectionService(
            collectionRepository,
            itemRepository,
            unitOfWork,
            new FakeCurrentUserService());

        var act = () => service.ExecuteAsync(
            new DeleteCollectionCommand("auth0|test-owner", Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        itemRepository.SoftDeleteByCollectionCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    private sealed class FakeCollectionRepository : ICollectionRepository
    {
        private readonly Guid _collectionId;
        private readonly string _ownerId;

        public FakeCollectionRepository(Guid collectionId = default, string ownerId = "")
        {
            _collectionId = collectionId;
            _ownerId = ownerId;
        }

        public int SoftDeleteCallCount { get; private set; }

        public Task AddAsync(Collection collection, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<Collection?>(null);

        public Task<IReadOnlyList<Collection>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Collection>>([]);

        public Task<bool> SoftDeleteAsync(
            Guid collectionId,
            string ownerId,
            DateTime deletedUtc,
            string deletedBy,
            CancellationToken cancellationToken)
        {
            SoftDeleteCallCount++;
            return Task.FromResult(collectionId == _collectionId && ownerId == _ownerId);
        }

        public Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();

        public Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();
    }

    private sealed class FakeItemRepository : IItemRepository
    {
        public int SoftDeleteByCollectionCallCount { get; private set; }
        public Guid? LastSoftDeletedCollectionId { get; private set; }

        public Task AddAsync(Item item, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task ReplaceAttributeValuesAsync(
            Guid itemId,
            IReadOnlyList<ItemAttributeValue> attributeValues,
            CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task ReplaceTagsAsync(Guid itemId, IReadOnlyList<ItemTag> itemTags, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult<Item?>(null);

        public Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Item>>([]);

        public Task<bool> SoftDeleteAsync(
            Guid itemId,
            Guid collectionId,
            DateTime deletedUtc,
            string deletedBy,
            CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SoftDeleteByCollectionAsync(
            Guid collectionId,
            DateTime deletedUtc,
            string deletedBy,
            CancellationToken cancellationToken)
        {
            SoftDeleteByCollectionCallCount++;
            LastSoftDeletedCollectionId = collectionId;
            return Task.CompletedTask;
        }

        public void AddMediaAsset(MediaAsset asset)
        {
        }

        public Task<PagedResult<ItemSummaryProjection>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken)
            => Task.FromResult(new PagedResult<ItemSummaryProjection>([], 0, 1, 50));
    }
}
