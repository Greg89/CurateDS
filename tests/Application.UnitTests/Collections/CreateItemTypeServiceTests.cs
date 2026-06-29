using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateItemType;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateItemTypeServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldCreateItemTypeInUnitOfWork()
    {
        var collection = Collection.Create("auth0|test-owner", "Equipment", DateTime.UtcNow, "system");
        var itemTypeRepository = new FakeItemTypeRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateItemTypeService(
            new FakeCollectionRepository(collection),
            itemTypeRepository,
            unitOfWork,
            new FakeCurrentUserService(),
            new CreateItemTypeCommandValidator());

        var result = await service.ExecuteAsync(
            new CreateItemTypeCommand(collection.OwnerId, collection.Id, "Machine"),
            CancellationToken.None);

        result.Name.Should().Be("Machine");
        result.SortOrder.Should().Be(0);
        var itemTypes = await itemTypeRepository.ListByCollectionAsync(collection.Id, CancellationToken.None);
        itemTypes.Should().ContainSingle(itemType => itemType.Id == result.Id);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateItemTypeService(
            new FakeCollectionRepository(),
            new FakeItemTypeRepository(),
            unitOfWork,
            new FakeCurrentUserService(),
            new CreateItemTypeCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateItemTypeCommand("auth0|test-owner", Guid.NewGuid(), "Machine"),
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
}
