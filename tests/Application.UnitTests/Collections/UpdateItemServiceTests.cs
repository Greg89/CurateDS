using CurateDS.Application.Abstractions;
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
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldUpdateItemAndReplaceAttributeValues()
    {
        var collection = Collection.Create(Guid.NewGuid(), "Trading Cards", DateTime.UtcNow, "system");
        var issueNumber = AttributeDefinition.Create(
            collection.Id,
            "Issue Number",
            AttributeDataType.Number,
            isRequired: true,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");
        var condition = AttributeDefinition.Create(
            collection.Id,
            "Condition",
            AttributeDataType.Text,
            isRequired: false,
            isFilterable: true,
            sortOrder: 1,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");

        var item = Item.Create(collection.Id, "Original Card", "Original", 1, DateTime.UtcNow, "system");
        item.ReplaceAttributeValues(
            [ItemAttributeValue.Create(item.Id, issueNumber, "1")],
            DateTime.UtcNow,
            "system");

        var itemRepository = new FakeItemRepository(item);
        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(issueNumber, condition),
            new FakeLocationRepository(),
            itemRepository,
            new FakeTagRepository(),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        var result = await service.ExecuteAsync(
            new UpdateItemCommand(
                collection.OwnerId,
                collection.Id,
                item.Id,
                "Updated Card",
                "Better copy",
                2,
                null,
                [],
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
        var collection = Collection.Create(Guid.NewGuid(), "Comics", DateTime.UtcNow, "system");
        var issueNumber = AttributeDefinition.Create(
            collection.Id,
            "Issue Number",
            AttributeDataType.Number,
            isRequired: true,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");
        var item = Item.Create(collection.Id, "Amazing Fantasy #15", null, 1, DateTime.UtcNow, "system");

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(issueNumber),
            new FakeLocationRepository(),
            new FakeItemRepository(item),
            new FakeTagRepository(),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateItemCommand(
                collection.OwnerId,
                collection.Id,
                item.Id,
                "Amazing Fantasy #15",
                null,
                1,
                null,
                [],
                []),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenItemDoesNotExist()
    {
        var collection = Collection.Create(Guid.NewGuid(), "Books", DateTime.UtcNow, "system");

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(),
            new FakeTagRepository(),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateItemCommand(
                collection.OwnerId,
                collection.Id,
                Guid.NewGuid(),
                "Missing Item",
                null,
                1,
                null,
                [],
                []),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldNotPersistCoreChanges_WhenAttributeParsingFails()
    {
        var createdUtc = DateTime.UtcNow;
        var collection = Collection.Create(Guid.NewGuid(), "Records", createdUtc, "system");
        var releaseYear = AttributeDefinition.Create(
            collection.Id,
            "Release Year",
            AttributeDataType.Number,
            isRequired: true,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");
        var item = Item.Create(collection.Id, "Original Name", "Original Description", 1, createdUtc, "system");
        item.ReplaceAttributeValues(
            [ItemAttributeValue.Create(item.Id, releaseYear, "1959")],
            createdUtc,
            "system");

        var itemRepository = new FakeItemRepository(item);
        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(releaseYear),
            new FakeLocationRepository(),
            itemRepository,
            new FakeTagRepository(),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateItemCommand(
                collection.OwnerId,
                collection.Id,
                item.Id,
                "Changed Name",
                "Changed Description",
                2,
                null,
                [],
                [new CreateItemAttributeValueInput(releaseYear.Id, "not-a-number")]),
            CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
        item.Name.Should().Be("Original Name");
        item.Description.Should().Be("Original Description");
        item.Quantity.Should().Be(1);
        itemRepository.SaveChangesCallCount.Should().Be(0);
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
            item.ReplaceAttributeValues(attributeValues, DateTime.UtcNow, "system");
            return Task.CompletedTask;
        }

        public Task ReplaceTagsAsync(Guid itemId, IReadOnlyList<ItemTag> itemTags, CancellationToken cancellationToken)
        {
            var item = _items.Single(existingItem => existingItem.Id == itemId);
            item.ReplaceTags(itemTags, DateTime.UtcNow, "system");
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

        public Task<bool> SoftDeleteAsync(Guid itemId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SoftDeleteByCollectionAsync(Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.CompletedTask;
    }

    private sealed class FakeLocationRepository : ILocationRepository
    {
        public Task AddAsync(Location location, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<Location?> GetByIdAndOwnerAsync(Guid locationId, Guid ownerId, CancellationToken cancellationToken)
            => Task.FromResult<Location?>(null);

        public Task<IReadOnlyList<Location>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Location>>([]);
    }

    private sealed class FakeTagRepository : ITagRepository
    {
        public Task AddAsync(Tag tag, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<bool> ExistsByKeyAsync(Guid ownerId, string key, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<IReadOnlyList<Tag>> ListByIdsAsync(Guid ownerId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>([]);

        public Task<IReadOnlyList<Tag>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>([]);
    }
}
