using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateAttributeDefinition;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

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
        var collection = Collection.Create("auth0|test-owner", "Board Games", DateTime.UtcNow, "system");
        var collectionRepository = new FakeCollectionRepository(collection);
        var attributeDefinitionRepository = new FakeAttributeDefinitionRepository();
        var service = new CreateAttributeDefinitionService(
            collectionRepository,
            attributeDefinitionRepository,
            new FakeItemTypeRepository(),
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
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenItemTypeIdDoesNotBelongToCollection()
    {
        var collection = Collection.Create("auth0|test-owner", "Board Games", DateTime.UtcNow, "system");
        var unknownItemTypeId = Guid.NewGuid();

        var service = new CreateAttributeDefinitionService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeItemTypeRepository(), // empty — unknown type won't be found
            new FakeCurrentUserService(),
            new CreateAttributeDefinitionCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateAttributeDefinitionCommand(
                collection.OwnerId,
                collection.Id,
                "Publisher",
                AttributeDataType.Text,
                false,
                false,
                unknownItemTypeId),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Item type was not found in this collection*");
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var service = new CreateAttributeDefinitionService(
            new FakeCollectionRepository(),
            new FakeAttributeDefinitionRepository(),
            new FakeItemTypeRepository(),
            new FakeCurrentUserService(),
            new CreateAttributeDefinitionCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateAttributeDefinitionCommand(
                "auth0|test-owner",
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

        public Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, string ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_collections.SingleOrDefault(collection =>
                collection.Id == collectionId && collection.OwnerId == ownerId));
        }

        public Task<IReadOnlyList<Collection>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<Collection>>(
                _collections.Where(collection => collection.OwnerId == ownerId).ToArray());
        }

        public Task<bool> SoftDeleteAsync(Guid collectionId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();

        public Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken)
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

        public Task<AttributeDefinition?> GetByIdAndCollectionAsync(Guid attributeDefinitionId, Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(AttributeDefinitions.SingleOrDefault(definition => definition.Id == attributeDefinitionId && definition.CollectionId == collectionId));

        public Task<bool> ExistsByKeyExcludingAsync(Guid collectionId, string key, Guid excludeAttributeDefinitionId, CancellationToken cancellationToken)
            => Task.FromResult(AttributeDefinitions.Any(definition => definition.CollectionId == collectionId && definition.Key == key && definition.Id != excludeAttributeDefinitionId));

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

}
