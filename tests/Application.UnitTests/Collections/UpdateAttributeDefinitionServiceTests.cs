using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.UpdateAttributeDefinition;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class UpdateAttributeDefinitionServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "actor";
    }

    private static UpdateAttributeDefinitionService BuildService(
        Collection collection,
        AttributeDefinition[] attributeDefinitions,
        ItemType[]? itemTypes = null)
    {
        var collectionRepository = new FakeCollectionRepository(collection);
        var attributeRepository = new FakeAttributeDefinitionRepository(attributeDefinitions);
        var itemTypeRepository = new FakeItemTypeRepository(itemTypes ?? []);
        return new UpdateAttributeDefinitionService(
            collectionRepository,
            attributeRepository,
            itemTypeRepository,
            new FakeCurrentUserService(),
            new UpdateAttributeDefinitionCommandValidator());
    }

    [Fact]
    public async Task ExecuteAsync_ShouldUpdateAttribute()
    {
        var collection = Collection.Create("auth0|test-owner", "Board Games", DateTime.UtcNow, "system");
        var attribute = AttributeDefinition.Create(
            collection.Id,
            "Publisher",
            AttributeDataType.Text,
            isRequired: false,
            isFilterable: false,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");
        var service = BuildService(collection, [attribute]);

        var result = await service.ExecuteAsync(
            new UpdateAttributeDefinitionCommand(
                collection.OwnerId,
                collection.Id,
                attribute.Id,
                "Studio",
                IsRequired: true,
                IsFilterable: true,
                ItemTypeId: null),
            CancellationToken.None);

        result.Name.Should().Be("Studio");
        result.Key.Should().Be("studio");
        result.DataType.Should().Be(AttributeDataType.Text);
        result.IsRequired.Should().BeTrue();
        result.IsFilterable.Should().BeTrue();
        result.UpdatedUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenKeyCollidesWithAnotherAttribute()
    {
        var collection = Collection.Create("auth0|test-owner", "Board Games", DateTime.UtcNow, "system");
        var subject = AttributeDefinition.Create(
            collection.Id, "Publisher", AttributeDataType.Text, false, false, 0, DateTime.UtcNow, "system");
        var rival = AttributeDefinition.Create(
            collection.Id, "Studio", AttributeDataType.Text, false, false, 1, DateTime.UtcNow, "system");

        var service = BuildService(collection, [subject, rival]);

        var act = () => service.ExecuteAsync(
            new UpdateAttributeDefinitionCommand(
                collection.OwnerId, collection.Id, subject.Id, "Studio", false, false, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .Where(exception => exception.Errors.Any(error => error.ErrorCode == "duplicate_attribute"));
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowNotFound_WhenAttributeMissing()
    {
        var collection = Collection.Create("auth0|test-owner", "Board Games", DateTime.UtcNow, "system");
        var service = BuildService(collection, []);

        var act = () => service.ExecuteAsync(
            new UpdateAttributeDefinitionCommand(
                collection.OwnerId, collection.Id, Guid.NewGuid(), "Studio", false, false, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowNotFound_WhenCollectionMissing()
    {
        var collection = Collection.Create("auth0|test-owner", "Board Games", DateTime.UtcNow, "system");
        var attribute = AttributeDefinition.Create(
            collection.Id, "Publisher", AttributeDataType.Text, false, false, 0, DateTime.UtcNow, "system");
        var collectionRepository = new FakeCollectionRepository(); // empty
        var attributeRepository = new FakeAttributeDefinitionRepository(attribute);
        var service = new UpdateAttributeDefinitionService(
            collectionRepository,
            attributeRepository,
            new FakeItemTypeRepository(),
            new FakeCurrentUserService(),
            new UpdateAttributeDefinitionCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateAttributeDefinitionCommand(
                collection.OwnerId, collection.Id, attribute.Id, "Studio", false, false, null),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenItemTypeMissing()
    {
        var collection = Collection.Create("auth0|test-owner", "Board Games", DateTime.UtcNow, "system");
        var attribute = AttributeDefinition.Create(
            collection.Id, "Publisher", AttributeDataType.Text, false, false, 0, DateTime.UtcNow, "system");
        var service = BuildService(collection, [attribute]);

        var act = () => service.ExecuteAsync(
            new UpdateAttributeDefinitionCommand(
                collection.OwnerId, collection.Id, attribute.Id, "Publisher", false, false, Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Item type was not found in this collection*");
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
            => Task.FromResult<IReadOnlyList<Collection>>(_collections.Where(c => c.OwnerId == ownerId).ToArray());

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

        public Task AddAsync(AttributeDefinition attributeDefinition, CancellationToken cancellationToken)
        {
            _attributeDefinitions.Add(attributeDefinition);
            return Task.CompletedTask;
        }

        public Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(_attributeDefinitions.Count(d => d.CollectionId == collectionId));

        public Task<IReadOnlyList<AttributeDefinition>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<AttributeDefinition>>(_attributeDefinitions.Where(d => d.CollectionId == collectionId).ToArray());

        public Task<bool> SoftDeleteAsync(Guid attributeDefinitionId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<AttributeDefinition?> GetByIdAndCollectionAsync(Guid attributeDefinitionId, Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(_attributeDefinitions.SingleOrDefault(d => d.Id == attributeDefinitionId && d.CollectionId == collectionId));

        public Task<bool> ExistsByKeyExcludingAsync(Guid collectionId, string key, Guid excludeAttributeDefinitionId, CancellationToken cancellationToken)
            => Task.FromResult(_attributeDefinitions.Any(d => d.CollectionId == collectionId && d.Key == key && d.Id != excludeAttributeDefinitionId));

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
