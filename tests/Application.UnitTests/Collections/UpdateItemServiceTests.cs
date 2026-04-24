using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.UpdateItem;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class UpdateItemServiceTests
{
    [Fact]
    public async Task ExecuteAsync_ShouldUpdateItemAndReplaceAttributeValues()
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
        var condition = AttributeDefinition.Create(
            collection.Id,
            "Condition",
            AttributeDataType.Text,
            isRequired: false,
            isFilterable: true,
            sortOrder: 1,
            createdUtc: DateTime.UtcNow);

        var item = Item.Create(collection.Id, "Original Card", "Original", 1, DateTime.UtcNow);
        item.ReplaceAttributeValues(
            [ItemAttributeValue.Create(item.Id, issueNumber, "1")],
            DateTime.UtcNow);

        var itemRepository = new FakeItemRepository(item);
        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(issueNumber, condition),
            itemRepository,
            new UpdateItemCommandValidator());

        var result = await service.ExecuteAsync(
            new UpdateItemCommand(
                collection.OwnerId,
                collection.Id,
                item.Id,
                "Updated Card",
                "Better copy",
                2,
                [
                    new CreateItemAttributeValueInput(issueNumber.Id, "12"),
                    new CreateItemAttributeValueInput(condition.Id, "Near Mint")
                ]),
            CancellationToken.None);

        result.Name.Should().Be("Updated Card");
        result.Quantity.Should().Be(2);
        result.AttributeValues.Should().HaveCount(2);
        itemRepository.SaveChangesCallCount.Should().Be(1);
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
        var item = Item.Create(collection.Id, "Amazing Fantasy #15", null, 1, DateTime.UtcNow);

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(issueNumber),
            new FakeItemRepository(item),
            new UpdateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateItemCommand(
                collection.OwnerId,
                collection.Id,
                item.Id,
                "Amazing Fantasy #15",
                null,
                1,
                []),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenItemDoesNotExist()
    {
        var collection = Collection.Create(Guid.NewGuid(), "Books", DateTime.UtcNow);

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeItemRepository(),
            new UpdateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateItemCommand(
                collection.OwnerId,
                collection.Id,
                Guid.NewGuid(),
                "Missing Item",
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
        private readonly List<Item> _items;

        public FakeItemRepository(params Item[] items)
        {
            _items = items.ToList();
        }

        public int SaveChangesCallCount { get; private set; }

        public Task AddAsync(Item item, CancellationToken cancellationToken)
        {
            _items.Add(item);
            return Task.CompletedTask;
        }

        public Task ReplaceAttributeValuesAsync(
            Guid itemId,
            IReadOnlyList<ItemAttributeValue> attributeValues,
            CancellationToken cancellationToken)
        {
            var item = _items.Single(existingItem => existingItem.Id == itemId);
            item.ReplaceAttributeValues(attributeValues, DateTime.UtcNow);
            return Task.CompletedTask;
        }

        public Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_items.SingleOrDefault(item => item.Id == itemId && item.CollectionId == collectionId));
        }

        public Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<Item>>(_items.Where(item => item.CollectionId == collectionId).ToArray());
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            SaveChangesCallCount++;
            return Task.CompletedTask;
        }
    }
}
