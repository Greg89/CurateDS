using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class ItemAttributeValueTests
{
    [Fact]
    public void Create_ShouldParseNumericValue()
    {
        var definition = AttributeDefinition.Create(
            Guid.NewGuid(),
            "Issue Number",
            AttributeDataType.Number,
            isRequired: true,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");

        var value = ItemAttributeValue.Create(Guid.NewGuid(), definition, "42");

        value.ValueNumber.Should().Be(42);
        value.GetDisplayValue(AttributeDataType.Number).Should().Be("42");
    }

    [Fact]
    public void Create_ShouldRejectInvalidBooleanValue()
    {
        var definition = AttributeDefinition.Create(
            Guid.NewGuid(),
            "Graded",
            AttributeDataType.Boolean,
            isRequired: false,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");

        var act = () => ItemAttributeValue.Create(Guid.NewGuid(), definition, "maybe");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldThrowArgumentNullException_WhenValueIsNull()
    {
        var definition = AttributeDefinition.Create(
            Guid.NewGuid(),
            "Notes",
            AttributeDataType.Text,
            isRequired: false,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow,
            createdBy: "system");

        var act = () => ItemAttributeValue.Create(Guid.NewGuid(), definition, null!);

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("value");
    }
}
