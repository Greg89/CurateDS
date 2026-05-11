using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class LocationTests
{
    [Fact]
    public void Create_ShouldTrimNameAndDescription()
    {
        var location = Location.Create(
            "auth0|test-owner",
            "  Office Shelf  ",
            "  Top left corner  ",
            DateTime.UtcNow,
            "system");

        location.Name.Should().Be("Office Shelf");
        location.Description.Should().Be("Top left corner");
    }

    [Fact]
    public void Create_ShouldThrowArgumentNullException_WhenNameIsNull()
    {
        var act = () => Location.Create("auth0|test-owner", null!, null, DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("name");
    }
}
