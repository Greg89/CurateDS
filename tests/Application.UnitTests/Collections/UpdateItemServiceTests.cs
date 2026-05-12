using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.ListItems;
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
        var collection = Collection.Create("auth0|test-owner", "Trading Cards", DateTime.UtcNow, "system");
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
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(),
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
        var collection = Collection.Create("auth0|test-owner", "Comics", DateTime.UtcNow, "system");
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
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(),
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
                null,
                [],
                []),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenAttributeValueBelongsToDifferentItemType()
    {
        var collection = Collection.Create("auth0|test-owner", "Trading Cards", DateTime.UtcNow, "system");
        var itemTypeA = ItemType.Create(collection.Id, "Type A", 0, DateTime.UtcNow, "system");
        var itemTypeB = ItemType.Create(collection.Id, "Type B", 1, DateTime.UtcNow, "system");

        var typeADefinition = AttributeDefinition.Create(
            collection.Id,
            "Rarity",
            AttributeDataType.Text,
            isRequired: false,
            isFilterable: false,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system",
            itemTypeId: itemTypeA.Id);

        var item = Item.Create(collection.Id, "Original Card", null, 1, DateTime.UtcNow, "system");

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(typeADefinition),
            new FakeLocationRepository(),
            new FakeItemRepository(item),
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(itemTypeA, itemTypeB),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateItemCommand(
                collection.OwnerId,
                collection.Id,
                item.Id,
                "Updated Card",
                null,
                1,
                null,
                itemTypeB.Id,
                [],
                [new CreateItemAttributeValueInput(typeADefinition.Id, "Rare")]),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Attribute values must belong to the selected collection and item type*");
    }

    [Fact]
    public async Task ExecuteAsync_ShouldNotRequireTypeSpecificAttribute_WhenDifferentItemTypeSelected()
    {
        var collection = Collection.Create("auth0|test-owner", "Trading Cards", DateTime.UtcNow, "system");
        var itemTypeA = ItemType.Create(collection.Id, "Type A", 0, DateTime.UtcNow, "system");
        var itemTypeB = ItemType.Create(collection.Id, "Type B", 1, DateTime.UtcNow, "system");

        var typeARequired = AttributeDefinition.Create(
            collection.Id,
            "Rarity",
            AttributeDataType.Text,
            isRequired: true,
            isFilterable: false,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system",
            itemTypeId: itemTypeA.Id);

        var item = Item.Create(collection.Id, "Dark Magician", null, 1, DateTime.UtcNow, "system");
        var itemRepository = new FakeItemRepository(item);

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(typeARequired),
            new FakeLocationRepository(),
            itemRepository,
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(itemTypeA, itemTypeB),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        // No attribute values, but the required definition belongs to typeA not typeB
        var result = await service.ExecuteAsync(
            new UpdateItemCommand(
                collection.OwnerId,
                collection.Id,
                item.Id,
                "Dark Magician",
                null,
                1,
                null,
                itemTypeB.Id,
                [],
                []),
            CancellationToken.None);

        result.Name.Should().Be("Dark Magician");
        itemRepository.SaveChangesCallCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenItemDoesNotExist()
    {
        var collection = Collection.Create("auth0|test-owner", "Books", DateTime.UtcNow, "system");

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(),
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(),
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
        var collection = Collection.Create("auth0|test-owner", "Records", createdUtc, "system");
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
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(),
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

    [Fact]
    public async Task ExecuteAsync_ShouldRecordEventWithNameChange_WhenNameDiffers()
    {
        var collection = Collection.Create("auth0|test-owner", "Books", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Old Name", null, 1, DateTime.UtcNow, "system");
        var eventRepository = new FakeItemEventRepository();

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(item),
            new FakeTagRepository(),
            eventRepository,
            new FakeItemTypeRepository(),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        await service.ExecuteAsync(
            new UpdateItemCommand(collection.OwnerId, collection.Id, item.Id, "New Name", null, 1, null, null, [], []),
            CancellationToken.None);

        eventRepository.Recorded.Should().ContainSingle();
        eventRepository.Recorded[0].Notes.Should().Contain("Old Name").And.Contain("New Name");
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRecordEventWithQuantityChange_WhenQuantityDiffers()
    {
        var collection = Collection.Create("auth0|test-owner", "Records", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Abbey Road", null, 1, DateTime.UtcNow, "system");
        var eventRepository = new FakeItemEventRepository();

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(item),
            new FakeTagRepository(),
            eventRepository,
            new FakeItemTypeRepository(),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        await service.ExecuteAsync(
            new UpdateItemCommand(collection.OwnerId, collection.Id, item.Id, "Abbey Road", null, 5, null, null, [], []),
            CancellationToken.None);

        eventRepository.Recorded.Should().ContainSingle();
        eventRepository.Recorded[0].Notes.Should().Contain("Quantity").And.Contain("1").And.Contain("5");
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRecordEventWithNullNotes_WhenNothingChanged()
    {
        var collection = Collection.Create("auth0|test-owner", "Stamps", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Same Name", "Same desc", 2, DateTime.UtcNow, "system");
        var eventRepository = new FakeItemEventRepository();

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(item),
            new FakeTagRepository(),
            eventRepository,
            new FakeItemTypeRepository(),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        await service.ExecuteAsync(
            new UpdateItemCommand(collection.OwnerId, collection.Id, item.Id, "Same Name", "Same desc", 2, null, null, [], []),
            CancellationToken.None);

        eventRepository.Recorded.Should().ContainSingle();
        eventRepository.Recorded[0].Notes.Should().BeNull();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRecordMultipleChanges_WhenSeveralFieldsDiffer()
    {
        var collection = Collection.Create("auth0|test-owner", "Coins", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Original", "Old desc", 1, DateTime.UtcNow, "system");
        var eventRepository = new FakeItemEventRepository();

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(item),
            new FakeTagRepository(),
            eventRepository,
            new FakeItemTypeRepository(),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        await service.ExecuteAsync(
            new UpdateItemCommand(collection.OwnerId, collection.Id, item.Id, "Updated", null, 3, null, null, [], []),
            CancellationToken.None);

        var notes = eventRepository.Recorded[0].Notes;
        notes.Should().Contain("Original").And.Contain("Updated");  // name change
        notes.Should().Contain("Quantity").And.Contain("1").And.Contain("3");  // quantity change
        notes.Should().Contain("Description removed");
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenItemTypeIdDoesNotBelongToCollection()
    {
        var collection = Collection.Create("auth0|test-owner", "Cards", DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Card", null, 1, DateTime.UtcNow, "system");
        var unknownItemTypeId = Guid.NewGuid();

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(item),
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(), // empty — unknown type won't be found
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateItemCommand(collection.OwnerId, collection.Id, item.Id, "Card", null, 1, null, unknownItemTypeId, [], []),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Item type was not found in this collection*");
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRecordItemTypeChangeInNotes_WhenItemTypeChanges()
    {
        var collection = Collection.Create("auth0|test-owner", "Stamps", DateTime.UtcNow, "system");
        var oldType = ItemType.Create(collection.Id, "Definitive", 0, DateTime.UtcNow, "system");
        var newType = ItemType.Create(collection.Id, "Commemorative", 1, DateTime.UtcNow, "system");
        var item = Item.Create(collection.Id, "Penny Black", null, 1, DateTime.UtcNow, "system");
        item.AssignItemType(oldType.Id, DateTime.UtcNow, "system");

        var eventRepository = new FakeItemEventRepository();

        var service = new UpdateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(item),
            new FakeTagRepository(),
            eventRepository,
            new FakeItemTypeRepository(oldType, newType),
            new FakeCurrentUserService(),
            new UpdateItemCommandValidator());

        await service.ExecuteAsync(
            new UpdateItemCommand(collection.OwnerId, collection.Id, item.Id, "Penny Black", null, 1, null, newType.Id, [], []),
            CancellationToken.None);

        eventRepository.Recorded.Should().ContainSingle();
        eventRepository.Recorded[0].Notes.Should().Contain("Definitive").And.Contain("Commemorative");
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

        public Task<bool> SoftDeleteAsync(Guid attributeDefinitionId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);
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

        public void AddMediaAsset(MediaAsset asset) { }

        public Task<PagedResult<ItemSummaryDto>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken)
            => Task.FromResult(new PagedResult<ItemSummaryDto>([], 0, 1, 50));
    }

    private sealed class FakeItemEventRepository : IItemEventRepository
    {
        public List<ItemEvent> Recorded { get; } = [];

        public Task RecordAsync(ItemEvent itemEvent, CancellationToken cancellationToken)
        {
            Recorded.Add(itemEvent);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<ItemEvent>> ListByItemAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<ItemEvent>>([]);

        public Task<PagedResult<CollectionActivityEventDto>> ListByCollectionAsync(Guid collectionId, int page, int pageSize, CancellationToken cancellationToken)
            => throw new NotImplementedException();

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeLocationRepository : ILocationRepository
    {
        public Task AddAsync(Location location, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<bool> ExistsByNameAsync(string ownerId, string name, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<Location?> GetByIdAndOwnerAsync(Guid locationId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<Location?>(null);

        public Task<IReadOnlyList<Location>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Location>>([]);

        public Task<bool> SoftDeleteAsync(Guid locationId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);
    }

    private sealed class FakeTagRepository : ITagRepository
    {
        public Task AddAsync(Tag tag, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<bool> ExistsByKeyAsync(string ownerId, string key, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<IReadOnlyList<Tag>> ListByIdsAsync(string ownerId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>([]);

        public Task<IReadOnlyList<Tag>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>([]);

        public Task<bool> SoftDeleteAsync(Guid tagId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);
    }

}
