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

    [Fact]
    public void Rename_ShouldUpdateNameAndKey_AndStampUpdateAudit()
    {
        var tag = Tag.Create("auth0|test-owner", "Favorites", DateTime.UtcNow, "system");
        var updatedAt = DateTime.UtcNow.AddMinutes(5);

        tag.Rename("  Top Picks  ", updatedAt, "actor");

        tag.Name.Should().Be("Top Picks");
        tag.Key.Should().Be("top-picks");
        tag.UpdatedUtc.Should().Be(updatedAt);
        tag.UpdatedBy.Should().Be("actor");
    }

    [Theory]
    [InlineData("a")]
    [InlineData("")]
    public void Rename_ShouldThrow_WhenNameTooShort(string newName)
    {
        var tag = Tag.Create("auth0|test-owner", "Favorites", DateTime.UtcNow, "system");

        var act = () => tag.Rename(newName, DateTime.UtcNow, "actor");

        act.Should().Throw<ArgumentException>().WithParameterName("name");
    }

    [Fact]
    public void Rename_ShouldThrow_WhenNameTooLong()
    {
        var tag = Tag.Create("auth0|test-owner", "Favorites", DateTime.UtcNow, "system");
        var longName = new string('a', 51);

        var act = () => tag.Rename(longName, DateTime.UtcNow, "actor");

        act.Should().Throw<ArgumentException>().WithParameterName("name");
    }
}
