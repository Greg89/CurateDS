using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using CurateDS.Infrastructure.Persistence.Repositories;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class CustomFieldSettingsTests
{
    [Fact]
    public async Task FieldChanges_ShouldKeepValuesOnRenameAndScopeChangeAndRemoveOnlyItsValuesOnDeletion()
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        var collection = Collection.Create("owner", "Custom details", DateTime.UtcNow, "owner");
        var type = ItemType.Create(collection.Id, "Book", 0, DateTime.UtcNow, "owner");
        var item = Item.Create(collection.Id, "Notebook", null, 1, DateTime.UtcNow, "owner");
        var field = AttributeDefinition.Create(collection.Id, "Maker", AttributeDataType.Text, true, true, 0, DateTime.UtcNow, "owner");
        var other = AttributeDefinition.Create(collection.Id, "Year", AttributeDataType.Number, false, false, 1, DateTime.UtcNow, "owner");
        await using (var db = new CatalogDbContext(database.Options))
        {
            await database.InitializeAsync(db);
            db.Collections.Add(collection); db.Items.Add(item); db.ItemTypes.Add(type); db.AttributeDefinitions.AddRange(field, other);
            db.ItemAttributeValues.AddRange(ItemAttributeValue.Create(item.Id, field, "Local bindery"), ItemAttributeValue.Create(item.Id, other, "2026"));
            await db.SaveChangesAsync();
        }
        await using (var db = new CatalogDbContext(database.Options))
        {
            var saved = await db.AttributeDefinitions.SingleAsync(f => f.Id == field.Id);
            saved.Update("Craftsperson", false, false, type.Id, DateTime.UtcNow, "owner");
            await db.SaveChangesAsync();
        }
        await using (var db = new CatalogDbContext(database.Options))
        {
            var saved = await db.AttributeDefinitions.SingleAsync(f => f.Id == field.Id);
            saved.Name.Should().Be("Craftsperson"); saved.ItemTypeId.Should().Be(type.Id); saved.IsRequired.Should().BeFalse(); saved.IsFilterable.Should().BeFalse();
            (await db.ItemAttributeValues.SingleAsync(v => v.AttributeDefinitionId == field.Id)).ValueText.Should().Be("Local bindery");
            (await new AttributeDefinitionRepository(db).SoftDeleteAsync(field.Id, Guid.NewGuid(), DateTime.UtcNow, "owner", default)).Should().BeFalse();
            (await new AttributeDefinitionRepository(db).SoftDeleteAsync(field.Id, collection.Id, DateTime.UtcNow, "owner", default)).Should().BeTrue();
            await db.SaveChangesAsync();
        }
        await using var read = new CatalogDbContext(database.Options);
        (await read.AttributeDefinitions.AnyAsync(f => f.Id == field.Id)).Should().BeFalse();
        (await read.ItemAttributeValues.AnyAsync(v => v.AttributeDefinitionId == field.Id)).Should().BeFalse();
        (await read.ItemAttributeValues.SingleAsync(v => v.AttributeDefinitionId == other.Id)).ValueNumber.Should().Be(2026);
        (await read.Items.AnyAsync(i => i.Id == item.Id)).Should().BeTrue();
    }
}
