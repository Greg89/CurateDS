using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class ItemTypeTests
{
    [Fact]
    public void Create_ShouldTrimName()
    {
        var itemType = ItemType.Create(Guid.NewGuid(), "  Machine  ", 0, DateTime.UtcNow, "system");

        itemType.Name.Should().Be("Machine");
    }

    [Fact]
    public void Create_ShouldAssignSortOrder()
    {
        var itemType = ItemType.Create(Guid.NewGuid(), "Part", 2, DateTime.UtcNow, "system");

        itemType.SortOrder.Should().Be(2);
    }

    [Fact]
    public void Create_ShouldThrowArgumentException_WhenNameTooShort()
    {
        var act = () => ItemType.Create(Guid.NewGuid(), "X", 0, DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentException>()
            .WithParameterName("name");
    }

    [Fact]
    public void Create_ShouldThrowArgumentException_WhenNameTooLong()
    {
        var act = () => ItemType.Create(Guid.NewGuid(), new string('A', 51), 0, DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentException>()
            .WithParameterName("name");
    }

    [Fact]
    public void Create_ShouldThrowArgumentException_WhenCollectionIdEmpty()
    {
        var act = () => ItemType.Create(Guid.Empty, "Part", 0, DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentException>()
            .WithParameterName("collectionId");
    }

    [Fact]
    public void Create_ShouldThrowArgumentNullException_WhenNameIsNull()
    {
        var act = () => ItemType.Create(Guid.NewGuid(), null!, 0, DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("name");
    }

    [Fact]
    public void Create_ShouldThrowArgumentException_WhenSortOrderIsNegative()
    {
        var act = () => ItemType.Create(Guid.NewGuid(), "Part", -1, DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentException>()
            .WithParameterName("sortOrder");
    }
}
