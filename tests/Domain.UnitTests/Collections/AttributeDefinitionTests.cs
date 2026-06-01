using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class AttributeDefinitionTests
{
    [Fact]
    public void Create_ShouldGenerateNormalizedKey_FromName()
    {
        var definition = AttributeDefinition.Create(
            Guid.NewGuid(),
            " Release Year ",
            AttributeDataType.Number,
            isRequired: false,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");

        definition.Key.Should().Be("release-year");
    }

    [Fact]
    public void Update_ShouldReplaceFieldsExceptDataType_AndStampUpdateAudit()
    {
        var definition = AttributeDefinition.Create(
            Guid.NewGuid(),
            "Release Year",
            AttributeDataType.Number,
            isRequired: false,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");
        var newItemTypeId = Guid.NewGuid();
        var updatedAt = DateTime.UtcNow.AddMinutes(5);

        definition.Update("  First Released  ", isRequired: true, isFilterable: false, itemTypeId: newItemTypeId, updatedAt, "actor");

        definition.Name.Should().Be("First Released");
        definition.Key.Should().Be("first-released");
        definition.IsRequired.Should().BeTrue();
        definition.IsFilterable.Should().BeFalse();
        definition.ItemTypeId.Should().Be(newItemTypeId);
        definition.DataType.Should().Be(AttributeDataType.Number);
        definition.UpdatedUtc.Should().Be(updatedAt);
        definition.UpdatedBy.Should().Be("actor");
    }

    [Fact]
    public void Update_ShouldThrow_WhenNameTooShort()
    {
        var definition = AttributeDefinition.Create(
            Guid.NewGuid(),
            "Release Year",
            AttributeDataType.Number,
            isRequired: false,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");

        var act = () => definition.Update("a", false, false, null, DateTime.UtcNow, "actor");

        act.Should().Throw<ArgumentException>().WithParameterName("name");
    }
}
