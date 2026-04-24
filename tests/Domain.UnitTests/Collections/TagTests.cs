using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class TagTests
{
    [Fact]
    public void Create_ShouldTrimAndBuildKey()
    {
        var tag = Tag.Create(Guid.NewGuid(), "  Favorite Finds  ", DateTime.UtcNow);

        tag.Name.Should().Be("Favorite Finds");
        tag.Key.Should().Be("favorite-finds");
    }

    [Fact]
    public void Create_ShouldThrowArgumentNullException_WhenNameIsNull()
    {
        var act = () => Tag.Create(Guid.NewGuid(), null!, DateTime.UtcNow);

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("name");
    }
}
