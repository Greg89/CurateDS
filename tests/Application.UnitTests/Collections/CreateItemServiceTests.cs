using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateItemServiceTests
{
    [Fact]
    public async Task ExecuteAsync_ShouldPersistItemWithAttributeValues()
    {
        var collection = Collection.Create(Guid.NewGuid(), "Trading Cards", DateTime.UtcNow);
        var issueNumber = AttributeDefinition.Create(
            collection.Id,
            "Issue Number",
            AttributeDataType.Number,
            isRequired: true,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow);
        var isFoil = AttributeDefinition.Create(
            collection.Id,
            "Foil",
            AttributeDataType.Boolean,
            isRequired: false,
            isFilterable: true,
            sortOrder: 1,
            createdUtc: DateTime.UtcNow);

        var itemRepository = new FakeItemRepository();
        var service = new CreateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(issueNumber, isFoil),
            itemRepository,
            new CreateItemCommandValidator());

        var result = await service.ExecuteAsync(
            new CreateItemCommand(
                collection.OwnerId,
                collection.Id,
                "Blue-Eyes White Dragon",
                "First edition",
                1,
                [
                    new CreateItemAttributeValueInput(issueNumber.Id, "12"),
                    new CreateItemAttributeValueInput(isFoil.Id, "true")
                ]),
            CancellationToken.None);

        result.Name.Should().Be("Blue-Eyes White Dragon");
        result.AttributeValues.Should().HaveCount(2);
        itemRepository.Items.Should().ContainSingle();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenRequiredAttributeIsMissing()
    {
        var collection = Collection.Create(Guid.NewGuid(), "Comics", DateTime.UtcNow);
        var issueNumber = AttributeDefinition.Create(
            collection.Id,
            "Issue Number",
            AttributeDataType.Number,
            isRequired: true,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow);

        var service = new CreateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(issueNumber),
            new FakeItemRepository(),
            new CreateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateItemCommand(
                collection.OwnerId,
                collection.Id,
                "Amazing Fantasy #15",
                null,
                1,
                []),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var service = new CreateItemService(
            new FakeCollectionRepository(),
            new FakeAttributeDefinitionRepository(),
            new FakeItemRepository(),
            new CreateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateItemCommand(
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Missing Collection Item",
                null,
                1,
                []),
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
        {
            return Task.FromResult(_attributeDefinitions.Count(definition => definition.CollectionId == collectionId));
        }

        public Task<IReadOnlyList<AttributeDefinition>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<AttributeDefinition>>(
                _attributeDefinitions.Where(definition => definition.CollectionId == collectionId).ToArray());
        }
    }

    private sealed class FakeItemRepository : IItemRepository
    {
        public List<Item> Items { get; } = [];

        public Task AddAsync(Item item, CancellationToken cancellationToken)
        {
            Items.Add(item);
            return Task.CompletedTask;
        }

        public Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken)
        {
            return Task.FromResult(Items.SingleOrDefault(item => item.Id == itemId && item.CollectionId == collectionId));
        }

        public Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<Item>>(Items.Where(item => item.CollectionId == collectionId).ToArray());
        }
    }
}
