using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.DeleteSavedView;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class DeleteSavedViewServiceTests
{
    [Fact]
    public async Task ExecuteAsync_ShouldRemoveSavedViewInUnitOfWork()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var savedView = SavedView.Create(collection.Id, collection.OwnerId, "Wish List", "{}", DateTime.UtcNow);
        var savedViewRepository = new FakeSavedViewRepository(savedView);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteSavedViewService(
            new FakeCollectionRepository(collection),
            savedViewRepository,
            unitOfWork);

        await service.ExecuteAsync(
            new DeleteSavedViewCommand(collection.OwnerId, collection.Id, savedView.Id),
            CancellationToken.None);

        savedViewRepository.SavedViews.Should().BeEmpty();
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenSavedViewDoesNotExist()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var savedViewRepository = new FakeSavedViewRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteSavedViewService(
            new FakeCollectionRepository(collection),
            savedViewRepository,
            unitOfWork);

        var act = () => service.ExecuteAsync(
            new DeleteSavedViewCommand(collection.OwnerId, collection.Id, Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        unitOfWork.ExecutionCount.Should().Be(0);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var savedViewRepository = new FakeSavedViewRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteSavedViewService(
            new FakeCollectionRepository(),
            savedViewRepository,
            unitOfWork);

        var act = () => service.ExecuteAsync(
            new DeleteSavedViewCommand("auth0|test-owner", Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
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

    private sealed class FakeSavedViewRepository : ISavedViewRepository
    {
        public List<SavedView> SavedViews { get; }

        public FakeSavedViewRepository(params SavedView[] savedViews)
        {
            SavedViews = savedViews.ToList();
        }

        public Task AddAsync(SavedView savedView, CancellationToken cancellationToken)
        {
            SavedViews.Add(savedView);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<SavedView>> ListByCollectionAsync(Guid collectionId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<SavedView>>(SavedViews.Where(savedView =>
                savedView.CollectionId == collectionId && savedView.OwnerId == ownerId).ToArray());

        public Task<SavedView?> GetByIdAsync(Guid id, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult(SavedViews.SingleOrDefault(savedView => savedView.Id == id && savedView.OwnerId == ownerId));

        public void Remove(SavedView savedView)
        {
            SavedViews.Remove(savedView);
        }
    }
}
