using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class CollectionTests
{
    [Fact]
    public void Create_ShouldTrimName_WhenNameContainsOuterWhitespace()
    {
        var ownerId = Guid.NewGuid();

        var collection = Collection.Create(ownerId, "  Board Games  ", DateTime.UtcNow, "system");

        collection.Name.Should().Be("Board Games");
    }

    [Fact]
    public void Create_ShouldThrow_WhenNameIsTooShort()
    {
        var act = () => Collection.Create(Guid.NewGuid(), "ab", DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentException>();
    }
}
