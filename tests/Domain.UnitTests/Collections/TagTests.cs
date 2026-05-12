using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class TagTests
{
    [Fact]
    public void Create_ShouldTrimAndBuildKey()
    {
        var tag = Tag.Create("auth0|test-owner", "  Favorite Finds  ", DateTime.UtcNow, "system");

        tag.Name.Should().Be("Favorite Finds");
        tag.Key.Should().Be("favorite-finds");
    }

    [Fact]
    public void Create_ShouldThrowArgumentNullException_WhenNameIsNull()
    {
        var act = () => Tag.Create("auth0|test-owner", null!, DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("name");
    }

    [Fact]
    public void Create_ShouldThrow_WhenOwnerIdIsWhitespace()
    {
        var act = () => Tag.Create("   ", "Wishlist", DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentException>().WithParameterName("ownerId");
    }
}
