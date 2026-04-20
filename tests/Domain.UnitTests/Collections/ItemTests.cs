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
            DateTime.UtcNow);

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
            DateTime.UtcNow);

        act.Should().Throw<ArgumentException>();
    }
}
