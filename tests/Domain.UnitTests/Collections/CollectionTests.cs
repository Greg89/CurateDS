using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class CollectionTests
{
    [Fact]
    public void Create_ShouldTrimName_WhenNameContainsOuterWhitespace()
    {
        var ownerId = "auth0|test-owner";

        var collection = Collection.Create(ownerId, "  Board Games  ", DateTime.UtcNow, "system");

        collection.Name.Should().Be("Board Games");
    }

    [Fact]
    public void Create_ShouldThrow_WhenNameIsTooShort()
    {
        var act = () => Collection.Create("auth0|test-owner", "ab", DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldThrow_WhenOwnerIdIsWhitespace()
    {
        var act = () => Collection.Create("   ", "Board Games", DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentException>().WithParameterName("ownerId");
    }
}
