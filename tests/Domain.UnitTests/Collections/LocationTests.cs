using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class LocationTests
{
    [Fact]
    public void Create_ShouldTrimNameAndDescription()
    {
        var location = Location.Create(
            Guid.NewGuid(),
            "  Office Shelf  ",
            "  Top left corner  ",
            DateTime.UtcNow);

        location.Name.Should().Be("Office Shelf");
        location.Description.Should().Be("Top left corner");
    }

    [Fact]
    public void Create_ShouldThrowArgumentNullException_WhenNameIsNull()
    {
        var act = () => Location.Create(Guid.NewGuid(), null!, null, DateTime.UtcNow);

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("name");
    }
}
