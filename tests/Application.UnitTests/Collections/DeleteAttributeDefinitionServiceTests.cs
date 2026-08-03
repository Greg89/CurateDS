using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.DeleteAttributeDefinition;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class DeleteAttributeDefinitionServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSoftDeleteAttributeDefinitionInUnitOfWork()
    {
        var collection = Collection.Create("auth0|test-owner", "Board Games", DateTime.UtcNow, "system");
        var attributeDefinition = AttributeDefinition.Create(
            collection.Id,
            "Publisher",
            AttributeDataType.Text,
            false,
            true,
            0,
            DateTime.UtcNow,
            "system");
        var attributeRepository = new FakeAttributeDefinitionRepository(attributeDefinition);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteAttributeDefinitionService(
            new FakeCollectionRepository(collection),
            attributeRepository,
            unitOfWork,
            new FakeCurrentUserService());

        await service.ExecuteAsync(
            new DeleteAttributeDefinitionCommand(collection.OwnerId, collection.Id, attributeDefinition.Id),
            CancellationToken.None);

        attributeRepository.SoftDeleteCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenAttributeDefinitionDoesNotExist()
    {
        var collection = Collection.Create("auth0|test-owner", "Board Games", DateTime.UtcNow, "system");
        var attributeRepository = new FakeAttributeDefinitionRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteAttributeDefinitionService(
            new FakeCollectionRepository(collection),
            attributeRepository,
            unitOfWork,
            new FakeCurrentUserService());

        var act = () => service.ExecuteAsync(
            new DeleteAttributeDefinitionCommand(collection.OwnerId, collection.Id, Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        attributeRepository.SoftDeleteCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var attributeRepository = new FakeAttributeDefinitionRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteAttributeDefinitionService(
            new FakeCollectionRepository(),
            attributeRepository,
            unitOfWork,
            new FakeCurrentUserService());

        var act = () => service.ExecuteAsync(
            new DeleteAttributeDefinitionCommand("auth0|test-owner", Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        attributeRepository.SoftDeleteCallCount.Should().Be(0);
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

    private sealed class FakeAttributeDefinitionRepository : IAttributeDefinitionRepository
    {
        private readonly List<AttributeDefinition> _attributeDefinitions;

        public FakeAttributeDefinitionRepository(params AttributeDefinition[] attributeDefinitions)
        {
            _attributeDefinitions = attributeDefinitions.ToList();
        }

        public int SoftDeleteCallCount { get; private set; }

        public Task AddAsync(AttributeDefinition attributeDefinition, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(0);

        public Task<IReadOnlyList<AttributeDefinition>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<AttributeDefinition>>(_attributeDefinitions.Where(definition => definition.CollectionId == collectionId).ToArray());

        public Task<bool> SoftDeleteAsync(Guid attributeDefinitionId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
        {
            SoftDeleteCallCount++;
            return Task.FromResult(_attributeDefinitions.Any(definition =>
                definition.Id == attributeDefinitionId && definition.CollectionId == collectionId));
        }

        public Task<AttributeDefinition?> GetByIdAndCollectionAsync(Guid attributeDefinitionId, Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(_attributeDefinitions.SingleOrDefault(definition => definition.Id == attributeDefinitionId && definition.CollectionId == collectionId));

        public Task<bool> ExistsByKeyExcludingAsync(Guid collectionId, string key, Guid excludeAttributeDefinitionId, CancellationToken cancellationToken)
            => Task.FromResult(false);
    }
}
