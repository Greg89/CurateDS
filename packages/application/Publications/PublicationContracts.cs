using System.Text.Json;
using System.Text.Json.Serialization;

namespace CurateDS.Application.Publications;

public sealed record PublicShowcase(int Version, string Slug, Guid RevisionToken, DateTime AsOfUtc,
    DateTime? PublishedUtc, string Title, string? Category, string? Description, string Layout,
    string Color, string ItemLabel, string ItemsLabel, bool ShowCover,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] PublicSummary? Summary,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] PublicItem[]? Highlights,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] PublicItem[]? Recent,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] PublicMonth[]? Growth,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] PublicTypes? Types);
public sealed record PublicItem(Guid Token, string Name, string? Description, bool DescriptionTruncated, Guid? ImageToken);
public sealed record PublicSummary(int TotalItems, int TotalMedia, int TagsInUse);
public sealed record PublicMonth(DateTime FromUtc, DateTime UntilUtc, int Count);
public sealed record PublicType(string Name, int Count);
public sealed record PublicTypes(PublicType[] Groups, int TotalGroups);
public sealed record PublicationStatus(string State, string? Slug, long Generation, Guid? RevisionToken,
    DateTime? PublishedUtc, string? SuspensionReason);
public sealed record PublicationPreview(Guid Token, DateTime ExpiresUtc, long Generation,
    PublicShowcase Showcase, string[] Notices);
public sealed record PreparePublication(string Slug, bool OmitImages = false);
public sealed record PublishPublication([property: JsonRequired] Guid CandidateToken, [property: JsonRequired] long ExpectedGeneration);
public sealed record PublicationImage(byte[] Bytes, string ContentType = "image/jpeg");
public sealed class PublicationConflictException(string message = "Prepare a new review before publishing.") : Exception(message);
public sealed class PublicationMediaException() : Exception("An image could not be prepared. Retry or prepare a review without images.");

public static class PublicationJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
    public static string Serialize(PublicShowcase showcase)
    {
        var json = JsonSerializer.Serialize(showcase, Options);
        if (System.Text.Encoding.UTF8.GetByteCount(json) > 64 * 1024)
            throw new PublicationConflictException("The public presentation is too large. Shorten the selected content.");
        return json;
    }
    public static PublicShowcase Read(string json) => JsonSerializer.Deserialize<PublicShowcase>(json, Options)!;
}

public interface IPublicationService
{
    Task<PublicationStatus> StatusAsync(string owner, Guid collectionId, CancellationToken ct);
    Task<PublicationPreview> PrepareAsync(string owner, Guid collectionId, PreparePublication request, CancellationToken ct);
    Task<PublicationPreview> PreviewAsync(string owner, Guid collectionId, Guid token, CancellationToken ct);
    Task<PublicationStatus> PublishAsync(string owner, Guid collectionId, PublishPublication request, CancellationToken ct);
    Task<PublicationStatus> UnpublishAsync(string owner, Guid collectionId, CancellationToken ct);
    Task<PublicShowcase> PublicAsync(string slug, Guid? revision, CancellationToken ct);
    Task<PublicationImage> PublicImageAsync(string slug, Guid revision, Guid asset, CancellationToken ct);
    Task<PublicationImage> PreviewImageAsync(string owner, Guid collectionId, Guid token, Guid asset, CancellationToken ct);
    Task<int> CleanupAsync(CancellationToken ct);
}

public interface IPublicationImageProcessor { byte[] Convert(byte[] source); }
public interface IPublicationStorage
{
    string Key(Guid revision, Guid asset);
    Task WriteAsync(string key, byte[] bytes, CancellationToken ct);
    Task<byte[]?> ReadAsync(string key, long maximumBytes, CancellationToken ct);
    Task DeleteAsync(string key, CancellationToken ct);
}
