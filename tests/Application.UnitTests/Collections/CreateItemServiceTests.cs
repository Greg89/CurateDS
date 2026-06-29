using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.Shared;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateItemServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldPersistItemWithAttributeValues()
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
        var isFoil = AttributeDefinition.Create(
            collection.Id,
            "Foil",
            AttributeDataType.Boolean,
            isRequired: false,
            isFilterable: true,
            sortOrder: 1,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");

        var itemRepository = new FakeItemRepository();
        var service = new CreateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(issueNumber, isFoil),
            new FakeLocationRepository(),
            itemRepository,
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(),
            new FakeCatalogUnitOfWork(),
            new FakeCurrentUserService(),
            new CreateItemCommandValidator());

        var result = await service.ExecuteAsync(
            new CreateItemCommand(
                collection.OwnerId,
                collection.Id,
                "Blue-Eyes White Dragon",
                "First edition",
                1,
                null,
                null,
                [],
                [
                    new AttributeValueInput(issueNumber.Id, "12"),
                    new AttributeValueInput(isFoil.Id, "true")
                ]),
            CancellationToken.None);

        result.Name.Should().Be("Blue-Eyes White Dragon");
        result.AttributeValues.Should().HaveCount(2);
        itemRepository.Items.Should().ContainSingle();
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

        var service = new CreateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(issueNumber),
            new FakeLocationRepository(),
            new FakeItemRepository(),
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(),
            new FakeCatalogUnitOfWork(),
            new FakeCurrentUserService(),
            new CreateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateItemCommand(
                collection.OwnerId,
                collection.Id,
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

        var service = new CreateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(typeADefinition),
            new FakeLocationRepository(),
            new FakeItemRepository(),
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(itemTypeA, itemTypeB),
            new FakeCatalogUnitOfWork(),
            new FakeCurrentUserService(),
            new CreateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateItemCommand(
                collection.OwnerId,
                collection.Id,
                "Blue-Eyes White Dragon",
                null,
                1,
                null,
                itemTypeB.Id,
                [],
                [new AttributeValueInput(typeADefinition.Id, "Rare")]),
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

        var itemRepository = new FakeItemRepository();
        var service = new CreateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(typeARequired),
            new FakeLocationRepository(),
            itemRepository,
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(itemTypeA, itemTypeB),
            new FakeCatalogUnitOfWork(),
            new FakeCurrentUserService(),
            new CreateItemCommandValidator());

        // No attribute values provided, but the required definition belongs to typeA not typeB
        var result = await service.ExecuteAsync(
            new CreateItemCommand(
                collection.OwnerId,
                collection.Id,
                "Dark Magician",
                null,
                1,
                null,
                itemTypeB.Id,
                [],
                []),
            CancellationToken.None);

        result.Name.Should().Be("Dark Magician");
        itemRepository.Items.Should().ContainSingle();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRequireGlobalAttribute_EvenWhenItemTypeIsSelected()
    {
        var collection = Collection.Create("auth0|test-owner", "Trading Cards", DateTime.UtcNow, "system");
        var itemTypeA = ItemType.Create(collection.Id, "Type A", 0, DateTime.UtcNow, "system");

        var globalRequired = AttributeDefinition.Create(
            collection.Id,
            "Condition",
            AttributeDataType.Text,
            isRequired: true,
            isFilterable: false,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system",
            itemTypeId: null); // global

        var service = new CreateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(globalRequired),
            new FakeLocationRepository(),
            new FakeItemRepository(),
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(itemTypeA),
            new FakeCatalogUnitOfWork(),
            new FakeCurrentUserService(),
            new CreateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateItemCommand(
                collection.OwnerId,
                collection.Id,
                "Blue-Eyes White Dragon",
                null,
                1,
                null,
                itemTypeA.Id,
                [],
                []),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Condition*required*");
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenItemTypeIdDoesNotBelongToCollection()
    {
        var collection = Collection.Create("auth0|test-owner", "Trading Cards", DateTime.UtcNow, "system");
        var unknownItemTypeId = Guid.NewGuid();

        var service = new CreateItemService(
            new FakeCollectionRepository(collection),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(),
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(), // empty — unknown type won't be found
            new FakeCatalogUnitOfWork(),
            new FakeCurrentUserService(),
            new CreateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateItemCommand(
                collection.OwnerId,
                collection.Id,
                "Blue-Eyes White Dragon",
                null,
                1,
                null,
                unknownItemTypeId,
                [],
                []),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Item type was not found in this collection*");
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenCollectionDoesNotExist()
    {
        var service = new CreateItemService(
            new FakeCollectionRepository(),
            new FakeAttributeDefinitionRepository(),
            new FakeLocationRepository(),
            new FakeItemRepository(),
            new FakeTagRepository(),
            new FakeItemEventRepository(),
            new FakeItemTypeRepository(),
            new FakeCatalogUnitOfWork(),
            new FakeCurrentUserService(),
            new CreateItemCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateItemCommand(
                "auth0|test-owner",
                Guid.NewGuid(),
                "Missing Collection Item",
                null,
                1,
                null,
                null,
                [],
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

        public Task<AttributeDefinition?> GetByIdAndCollectionAsync(Guid attributeDefinitionId, Guid collectionId, CancellationToken cancellationToken)
            => Task.FromResult(_attributeDefinitions.SingleOrDefault(d => d.Id == attributeDefinitionId && d.CollectionId == collectionId));

        public Task<bool> ExistsByKeyExcludingAsync(Guid collectionId, string key, Guid excludeAttributeDefinitionId, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeItemRepository : IItemRepository
    {
        public List<Item> Items { get; } = [];

        public Task AddAsync(Item item, CancellationToken cancellationToken)
        {
            Items.Add(item);
            return Task.CompletedTask;
        }

        public Task ReplaceAttributeValuesAsync(
            Guid itemId,
            IReadOnlyList<ItemAttributeValue> attributeValues,
            CancellationToken cancellationToken)
        {
            var item = Items.Single(existingItem => existingItem.Id == itemId);
            item.ReplaceAttributeValues(attributeValues, DateTime.UtcNow, "system");
            return Task.CompletedTask;
        }

        public Task ReplaceTagsAsync(Guid itemId, IReadOnlyList<ItemTag> itemTags, CancellationToken cancellationToken)
        {
            var item = Items.Single(existingItem => existingItem.Id == itemId);
            item.ReplaceTags(itemTags, DateTime.UtcNow, "system");
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

        public Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public Task<bool> SoftDeleteAsync(Guid itemId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SoftDeleteByCollectionAsync(Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public void AddMediaAsset(MediaAsset asset) { }

        public Task<PagedResult<ItemSummaryProjection>> QueryAsync(ListItemsQuery query, CancellationToken cancellationToken)
            => Task.FromResult(new PagedResult<ItemSummaryProjection>([], 0, 1, 50));
    }

    private sealed class FakeItemEventRepository : IItemEventRepository
    {
        public Task RecordAsync(ItemEvent itemEvent, CancellationToken cancellationToken) => Task.CompletedTask;

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

        public Task<bool> ExistsByNameExcludingAsync(string ownerId, string name, Guid excludeLocationId, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<Location?> GetByIdAndOwnerAsync(Guid locationId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<Location?>(null);

        public Task<IReadOnlyList<Location>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Location>>([]);

        public Task<bool> SoftDeleteAsync(Guid locationId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeTagRepository : ITagRepository
    {
        public Task AddAsync(Tag tag, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<bool> ExistsByKeyAsync(string ownerId, string key, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<bool> ExistsByKeyExcludingAsync(string ownerId, string key, Guid excludeTagId, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<Tag?> GetByIdAndOwnerAsync(Guid tagId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<Tag?>(null);

        public Task<IReadOnlyList<Tag>> ListByIdsAsync(string ownerId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>([]);

        public Task<IReadOnlyList<Tag>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>([]);

        public Task<bool> SoftDeleteAsync(Guid tagId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SaveChangesAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

}
