using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class ItemTests
{
    [Fact]
    public void Create_ShouldTrimNameAndDescription()
    {
        var item = Item.Create(
            Guid.NewGuid(),
            "  Blue-Eyes White Dragon  ",
            "  First edition  ",
            2,
            DateTime.UtcNow,
            "system");

        item.Name.Should().Be("Blue-Eyes White Dragon");
        item.Description.Should().Be("First edition");
        item.Quantity.Should().Be(2);
    }

    [Fact]
    public void Create_ShouldRejectZeroQuantity()
    {
        var act = () => Item.Create(
            Guid.NewGuid(),
            "Rare Figure",
            null,
            0,
            DateTime.UtcNow,
            "system");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateDetails_ShouldReplaceCoreFields()
    {
        var item = Item.Create(
            Guid.NewGuid(),
            "Original Name",
            "Original Description",
            1,
            DateTime.UtcNow,
            "system");
        var nextUpdatedUtc = DateTime.UtcNow.AddMinutes(5);

        item.UpdateDetails(" Updated Name ", " Updated Description ", 3, nextUpdatedUtc, "system");

        item.Name.Should().Be("Updated Name");
        item.Description.Should().Be("Updated Description");
        item.Quantity.Should().Be(3);
        item.UpdatedUtc.Should().Be(nextUpdatedUtc);
    }

    [Fact]
    public void Create_ShouldThrowArgumentNullException_WhenNameIsNull()
    {
        var act = () => Item.Create(
            Guid.NewGuid(),
            null!,
            null,
            1,
            DateTime.UtcNow,
            "system");

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("name");
    }

    [Fact]
    public void UpdateDetails_ShouldThrowArgumentNullException_WhenNameIsNull()
    {
        var item = Item.Create(
            Guid.NewGuid(),
            "Original Name",
            null,
            1,
            DateTime.UtcNow,
            "system");

        var act = () => item.UpdateDetails(null!, null, 1, DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("name");
    }
}
