using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class SavedViewTests
{
    [Fact]
    public void Create_ShouldTrimName()
    {
        var view = SavedView.Create(Guid.NewGuid(), "auth0|test-owner", "  Top Shelf  ", "{}", DateTime.UtcNow);

        view.Name.Should().Be("Top Shelf");
    }

    [Fact]
    public void Create_ShouldThrow_WhenOwnerIdIsWhitespace()
    {
        var act = () => SavedView.Create(Guid.NewGuid(), "   ", "Top Shelf", "{}", DateTime.UtcNow);

        act.Should().Throw<ArgumentException>().WithParameterName("ownerId");
    }
}
