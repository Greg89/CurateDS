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

    [Fact]
    public void Create_ShouldThrow_WhenOwnerIdIsWhitespace()
    {
        var act = () => Location.Create("   ", "Shelf", null, DateTime.UtcNow, "system");

        act.Should().Throw<ArgumentException>().WithParameterName("ownerId");
    }

    [Fact]
    public void Update_ShouldReplaceNameAndDescription_AndStampUpdateAudit()
    {
        var location = Location.Create("auth0|test-owner", "Shelf", "Old", DateTime.UtcNow, "system");
        var updatedAt = DateTime.UtcNow.AddMinutes(5);

        location.Update("  Cabinet  ", "  Drawer 3  ", updatedAt, "actor");

        location.Name.Should().Be("Cabinet");
        location.Description.Should().Be("Drawer 3");
        location.UpdatedUtc.Should().Be(updatedAt);
        location.UpdatedBy.Should().Be("actor");
    }

    [Fact]
    public void Update_ShouldClearDescription_WhenWhitespace()
    {
        var location = Location.Create("auth0|test-owner", "Shelf", "Old", DateTime.UtcNow, "system");

        location.Update("Shelf", "   ", DateTime.UtcNow, "actor");

        location.Description.Should().BeNull();
    }

    [Fact]
    public void Update_ShouldThrow_WhenDescriptionTooLong()
    {
        var location = Location.Create("auth0|test-owner", "Shelf", null, DateTime.UtcNow, "system");
        var longDescription = new string('x', 241);

        var act = () => location.Update("Shelf", longDescription, DateTime.UtcNow, "actor");

        act.Should().Throw<ArgumentException>().WithParameterName("description");
    }

    [Fact]
    public void Update_ShouldThrow_WhenNameTooShort()
    {
        var location = Location.Create("auth0|test-owner", "Shelf", null, DateTime.UtcNow, "system");

        var act = () => location.Update("a", null, DateTime.UtcNow, "actor");

        act.Should().Throw<ArgumentException>().WithParameterName("name");
    }
}
