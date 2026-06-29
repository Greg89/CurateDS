using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateSavedView;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateSavedViewServiceTests
{
    [Fact]
    public async Task ExecuteAsync_ShouldCreateSavedViewInUnitOfWork()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var savedViewRepository = new FakeSavedViewRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateSavedViewService(
            new FakeCollectionRepository(collection),
            savedViewRepository,
            unitOfWork,
            new CreateSavedViewCommandValidator());

        var result = await service.ExecuteAsync(
            new CreateSavedViewCommand(collection.OwnerId, collection.Id, "Wish List", "{}"),
            CancellationToken.None);

        result.Name.Should().Be("Wish List");
        savedViewRepository.SavedViews.Should().ContainSingle(savedView => savedView.Id == result.Id);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var savedViewRepository = new FakeSavedViewRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateSavedViewService(
            new FakeCollectionRepository(),
            savedViewRepository,
            unitOfWork,
            new CreateSavedViewCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateSavedViewCommand("auth0|test-owner", Guid.NewGuid(), "Missing", "{}"),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        savedViewRepository.SavedViews.Should().BeEmpty();
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
        public List<SavedView> SavedViews { get; } = [];

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

        public Task SaveChangesAsync(CancellationToken cancellationToken)
            => Task.CompletedTask;
    }
}
