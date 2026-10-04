using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests;

public sealed class ShowcasePublicationTests
{
    private static ShowcaseEdition Review(Guid collection, long generation = 0, string slug = "reading-room")
    {
        var result = new ShowcaseEdition(Guid.NewGuid(), collection, slug, generation, DateTime.UtcNow, "{}", false);
        result.MarkReady(); return result;
    }
    [Theory]
    [InlineData("good-slug", true)] [InlineData("abc", true)] [InlineData("Aaa", false)]
    [InlineData("ab", false)] [InlineData("has--gap", false)] [InlineData(" leading", false)]
    [InlineData("abc\n", false)] [InlineData("café", false)]
    public void Slugs_AreExplicitAscii(string slug, bool valid) => ShowcasePublication.IsValidSlug(slug).Should().Be(valid);

    [Fact]
    public void Revoke_InvalidatesOldReviewAndRetainsSlug()
    {
        var id = Guid.NewGuid(); var head = new ShowcasePublication(id); var edition = Review(id);
        head.Publish(edition, 0, DateTime.UtcNow);
        head.Publish(edition, 0, DateTime.UtcNow); head.Generation.Should().Be(1);
        head.Revoke(null); head.Slug.Should().Be("reading-room"); head.ActiveEditionId.Should().BeNull();
        var stale = () => head.Publish(edition, 0, DateTime.UtcNow); stale.Should().Throw<InvalidOperationException>();
        var fresh = Review(id, head.Generation); head.Publish(fresh, head.Generation, DateTime.UtcNow);
        var retryOld = () => head.Publish(edition, 0, DateTime.UtcNow); retryOld.Should().Throw<InvalidOperationException>();
    }
    [Fact]
    public void InvalidReview_CannotReplacePublishedEdition()
    {
        var id = Guid.NewGuid(); var head = new ShowcasePublication(id); var edition = Review(id);
        head.Publish(edition, 0, DateTime.UtcNow);
        var wrongSlug = () => head.Publish(Review(id, 1, "different-slug"), 1, DateTime.UtcNow);
        wrongSlug.Should().Throw<InvalidOperationException>(); head.ActiveEditionId.Should().Be(edition.Id);
        var expired = () => head.Publish(Review(id, 1), 1, DateTime.UtcNow.AddHours(1));
        expired.Should().Throw<InvalidOperationException>(); head.ActiveEditionId.Should().Be(edition.Id);
    }
}
