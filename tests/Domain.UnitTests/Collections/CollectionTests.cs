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
    [Fact]
    public void UpdateIdentity_ShouldNormalizeAndAuditWithoutChangingOwnershipOrCreation()
    {
        var created = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var updated = created.AddDays(1);
        var collection = Collection.Create("owner", "Original name", created, "creator");
        var id = collection.Id;
        collection.UpdateIdentity("  New name  ", " Books ", " Story ", " https://example.org/image.jpg ", "clay", updated, "editor");
        collection.Id.Should().Be(id);
        collection.OwnerId.Should().Be("owner");
        collection.CreatedUtc.Should().Be(created);
        collection.CreatedBy.Should().Be("creator");
        collection.UpdatedUtc.Should().Be(updated);
        collection.UpdatedBy.Should().Be("editor");
        collection.Name.Should().Be("New name");
        collection.Category.Should().Be("Books");
        collection.CoverImageUrl.Should().Be("https://example.org/image.jpg");
        collection.UpdateIdentity("New name", " ", null, "", null, updated, "editor");
        collection.Category.Should().BeNull();
        collection.Description.Should().BeNull();
        collection.CoverImageUrl.Should().BeNull();
        collection.Color.Should().BeNull();
    }

    [Fact]
    public void UpdateIdentity_ShouldLeaveAllFieldsAndAuditUnchangedWhenValidationFails()
    {
        var collection = Collection.Create("owner", "Original name", DateTime.UtcNow, "creator", "Books");
        var act = () => collection.UpdateIdentity("Different name", "Records", "New description", "http://unsafe.example/image.jpg", "slate", DateTime.UtcNow, "editor");
        act.Should().Throw<ArgumentException>();
        collection.Name.Should().Be("Original name");
        collection.Category.Should().Be("Books");
        collection.Description.Should().BeNull();
        collection.UpdatedUtc.Should().BeNull();
    }
}
