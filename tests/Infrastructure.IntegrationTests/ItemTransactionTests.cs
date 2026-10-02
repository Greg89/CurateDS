using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.DeleteItem;
using CurateDS.Application.Collections.UpdateItem;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using CurateDS.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class ItemTransactionTests
{
    [Theory]
    [InlineData("create", false)]
    [InlineData("update", false)]
    [InlineData("delete", false)]
    [InlineData("create", true)]
    [InlineData("update", true)]
    [InlineData("delete", true)]
    public async Task ItemWriteAndEvent_ShouldCommitTogetherOrRollback(string operation, bool rejectEvent)
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        var options = database.Options;
        var collection = Collection.Create("test-owner", "Test collection", DateTime.UtcNow, "tester");
        var original = Item.Create(collection.Id, "Original item", null, 1, DateTime.UtcNow, "tester");
        await using (var seed = new CatalogDbContext(options))
        {
            await database.InitializeAsync(seed);
            seed.Collections.Add(collection);
            if (operation != "create") seed.Items.Add(original);
            await seed.SaveChangesAsync();
            if (rejectEvent)
            {
                await seed.Database.ExecuteSqlRawAsync(database.IsPostgres ? """
                    CREATE FUNCTION reject_item_event() RETURNS trigger LANGUAGE plpgsql AS $$
                    BEGIN RAISE EXCEPTION 'injected event persistence failure'; END;
                    $$;
                    CREATE TRIGGER reject_item_event BEFORE INSERT ON item_events
                    FOR EACH ROW EXECUTE FUNCTION reject_item_event();
                    """ : """
                    CREATE TRIGGER reject_item_event BEFORE INSERT ON item_events
                    BEGIN SELECT RAISE(ABORT, 'injected event persistence failure'); END;
                    """);
            }
        }

        await using (var context = new CatalogDbContext(options))
        {
            var events = new FlushBeforeEventRepository(context);
            Func<Task> execute = () => ExecuteAsync(operation, context, events, collection, original.Id);
            if (rejectEvent)
            {
                var failure = await execute.Should().ThrowAsync<DbUpdateException>();
                failure.Which.InnerException.Should().BeAssignableTo<DbException>()
                    .Which.Message.Should().Contain("injected event persistence failure");
            }
            else
            {
                await execute();
            }
            events.FlushedItemChanges.Should().BeTrue("the test must exercise a real write before the event insert");
            context.Database.CurrentTransaction.Should().BeNull();
        }

        // A fresh context prevents tracked in-memory entities from hiding a partial database write.
        await using var verify = new CatalogDbContext(options);
        var items = await verify.Items.IgnoreQueryFilters().ToListAsync();
        var recordedEvents = await verify.ItemEvents.ToListAsync();
        if (rejectEvent)
        {
            recordedEvents.Should().BeEmpty();
            if (operation == "create")
            {
                items.Should().BeEmpty();
            }
            else
            {
                var item = items.Should().ContainSingle().Subject;
                item.Id.Should().Be(original.Id);
                item.Name.Should().Be("Original item");
                item.Quantity.Should().Be(1);
                item.UpdatedUtc.Should().BeNull();
                item.DeletedUtc.Should().BeNull();
                item.DeletedBy.Should().BeNull();
            }
        }
        else
        {
            var item = items.Should().ContainSingle().Subject;
            var itemEvent = recordedEvents.Should().ContainSingle().Subject;
            itemEvent.ItemId.Should().Be(item.Id);
            itemEvent.CollectionId.Should().Be(collection.Id);
            itemEvent.EventType.Should().Be(operation switch
            {
                "create" => ItemEventType.Created,
                "update" => ItemEventType.Updated,
                _ => ItemEventType.Deleted
            });
            item.Name.Should().Be(operation == "delete" ? "Original item" : "Changed item");
            item.Quantity.Should().Be(operation == "delete" ? 1 : 2);
            if (operation == "delete")
            {
                item.DeletedUtc.Should().NotBeNull();
                (await verify.Items.AnyAsync()).Should().BeFalse();
            }
            else
            {
                item.DeletedUtc.Should().BeNull();
            }
        }
    }

    private static async Task ExecuteAsync(string operation, CatalogDbContext context,
        IItemEventRepository events, Collection collection, Guid itemId)
    {
        var collections = new CollectionRepository(context);
        var items = new ItemRepository(context);
        var attributes = new AttributeDefinitionRepository(context);
        var locations = new LocationRepository(context);
        var tags = new TagRepository(context);
        var types = new ItemTypeRepository(context);
        var unitOfWork = new EfCatalogUnitOfWork(context);
        var user = new TestCurrentUser();
        if (operation == "create")
        {
            var service = new CreateItemService(collections, attributes, locations, items, tags,
                events, types, unitOfWork, user, new CreateItemCommandValidator());
            await service.ExecuteAsync(new CreateItemCommand(collection.OwnerId, collection.Id,
                "Changed item", null, 2, null, null, [], []), CancellationToken.None);
        }
        else if (operation == "update")
        {
            var service = new UpdateItemService(collections, attributes, locations, items, tags,
                events, types, unitOfWork, user, new UpdateItemCommandValidator());
            await service.ExecuteAsync(new UpdateItemCommand(collection.OwnerId, collection.Id, itemId,
                "Changed item", null, 2, null, null, [], []), CancellationToken.None);
        }
        else
        {
            var service = new DeleteItemService(collections, items, events, unitOfWork, user);
            await service.ExecuteAsync(new DeleteItemCommand(collection.OwnerId, collection.Id, itemId),
                CancellationToken.None);
        }
    }

    private sealed class TestCurrentUser : ICurrentUserService
    {
        public string GetCurrentUser() => "tester";
    }

    // Deliberately flush the first write so EF's single-SaveChanges implicit transaction cannot
    // make a missing service/unit-of-work transaction appear correct. The real repository then
    // stages the event; the database rejects its insert at the unit-of-work save in failure cases.
    private sealed class FlushBeforeEventRepository(CatalogDbContext context) : IItemEventRepository
    {
        private readonly ItemEventRepository _inner = new(context);
        public bool FlushedItemChanges { get; private set; }

        public async Task RecordAsync(ItemEvent itemEvent, CancellationToken cancellationToken)
        {
            FlushedItemChanges = await context.SaveChangesAsync(cancellationToken) > 0;
            await _inner.RecordAsync(itemEvent, cancellationToken);
        }

        public Task<IReadOnlyList<ItemEvent>> ListByItemAsync(Guid itemId, Guid collectionId,
            CancellationToken cancellationToken) => _inner.ListByItemAsync(itemId, collectionId, cancellationToken);

        public Task<PagedResult<CollectionActivityEventDto>> ListByCollectionAsync(Guid collectionId,
            int page, int pageSize, CancellationToken cancellationToken) =>
            _inner.ListByCollectionAsync(collectionId, page, pageSize, cancellationToken);
    }
}
