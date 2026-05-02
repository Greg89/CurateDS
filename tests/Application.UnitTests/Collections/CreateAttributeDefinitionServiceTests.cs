using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateAttributeDefinition;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateAttributeDefinitionServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldPersistAttributeDefinition()
    {
        var collection = Collection.Create(Guid.NewGuid(), "Board Games", DateTime.UtcNow, "system");
        var collectionRepository = new FakeCollectionRepository(collection);
        var attributeDefinitionRepository = new FakeAttributeDefinitionRepository();
        var service = new CreateAttributeDefinitionService(
            collectionRepository,
            attributeDefinitionRepository,
            new FakeCurrentUserService(),
            new CreateAttributeDefinitionCommandValidator());

        var result = await service.ExecuteAsync(
            new CreateAttributeDefinitionCommand(
                collection.OwnerId,
                collection.Id,
                "Publisher",
                AttributeDataType.Text,
                IsRequired: true,
                IsFilterable: true),
            CancellationToken.None);

        result.Name.Should().Be("Publisher");
        result.Key.Should().Be("publisher");
        result.SortOrder.Should().Be(0);
        attributeDefinitionRepository.AttributeDefinitions.Should().ContainSingle();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var service = new CreateAttributeDefinitionService(
            new FakeCollectionRepository(),
            new FakeAttributeDefinitionRepository(),
            new FakeCurrentUserService(),
            new CreateAttributeDefinitionCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateAttributeDefinitionCommand(
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Publisher",
                AttributeDataType.Text,
                false,
                false),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    private sealed class FakeCollectionRepository : ICollectionRepository
    {
        private readonly List<Collection> _collections;

        public FakeCollectionRepository(params Collection[] collections)
        {
            _collections = collections.ToList();
        }

        public Task AddAsync(Collection collection, CancellationToken cancellationToken)
        {
            _collections.Add(collection);
            return Task.CompletedTask;
        }

        public Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, Guid ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_collections.SingleOrDefault(collection =>
                collection.Id == collectionId && collection.OwnerId == ownerId));
        }

        public Task<IReadOnlyList<Collection>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<Collection>>(
                _collections.Where(collection => collection.OwnerId == ownerId).ToArray());
        }

        public Task<bool> SoftDeleteAsync(Guid collectionId, Guid ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();
    }

    private sealed class FakeAttributeDefinitionRepository : IAttributeDefinitionRepository
    {
        public List<AttributeDefinition> AttributeDefinitions { get; } = [];

        public Task AddAsync(AttributeDefinition attributeDefinition, CancellationToken cancellationToken)
        {
            AttributeDefinitions.Add(attributeDefinition);
            return Task.CompletedTask;
        }

        public Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken)
        {
            return Task.FromResult(AttributeDefinitions.Count(definition => definition.CollectionId == collectionId));
        }

        public Task<IReadOnlyList<AttributeDefinition>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<AttributeDefinition>>(
                AttributeDefinitions.Where(definition => definition.CollectionId == collectionId).ToArray());
        }

        public Task<bool> SoftDeleteAsync(Guid attributeDefinitionId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);
    }
}
