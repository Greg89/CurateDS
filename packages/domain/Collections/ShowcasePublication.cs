using System.Text.RegularExpressions;

namespace CurateDS.Domain.Collections;

// A retained head reserves its slug even after the source collection is deleted.
public sealed class ShowcasePublication
{
    private ShowcasePublication() { }
    public ShowcasePublication(Guid collectionId) => CollectionId = collectionId;
    public Guid CollectionId { get; private set; }
    public string? Slug { get; private set; }
    public long Generation { get; private set; }
    public Guid? ActiveEditionId { get; private set; }
    public DateTime? PublishedUtc { get; private set; }
    public string? SuspensionReason { get; private set; }

    public static bool IsValidSlug(string? slug) => slug is { Length: >= 3 and <= 80 } &&
        Regex.IsMatch(slug, "^[a-z0-9]+(?:-[a-z0-9]+)*\\z", RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100));

    public void Publish(ShowcaseEdition edition, long expectedGeneration, DateTime now)
    {
        if (ActiveEditionId == edition.Id && edition.PublishedUtc is not null) return;
        if (Generation != expectedGeneration || edition.Generation != Generation || edition.CollectionId != CollectionId ||
            !edition.Ready || edition.ExpiresUtc <= now || edition.PublishedUtc is not null ||
            !IsValidSlug(edition.Slug) || (Slug is not null && Slug != edition.Slug))
            throw new InvalidOperationException("Prepare a new review before publishing.");
        Slug = edition.Slug;
        ActiveEditionId = edition.Id;
        PublishedUtc = now;
        SuspensionReason = null;
        Generation++;
        edition.Activate(now);
    }

    public void Revoke(string? reason)
    {
        ActiveEditionId = null;
        PublishedUtc = null;
        SuspensionReason = reason;
        Generation++;
    }
}

public sealed class ShowcaseEdition
{
    private ShowcaseEdition() { }
    public ShowcaseEdition(Guid id, Guid collectionId, string slug, long generation, DateTime now, string payload, bool includesTypes)
    {
        Id = id; CollectionId = collectionId; Slug = slug; Generation = generation;
        PreparedUtc = now; ExpiresUtc = now.AddMinutes(30); Payload = payload; IncludesTypes = includesTypes;
    }
    public Guid Id { get; private set; }
    public Guid CollectionId { get; private set; }
    public string Slug { get; private set; } = null!;
    public long Generation { get; private set; }
    public DateTime PreparedUtc { get; private set; }
    public DateTime ExpiresUtc { get; private set; }
    public DateTime? PublishedUtc { get; private set; }
    public bool Ready { get; private set; }
    public bool IncludesTypes { get; private set; }
    public string Payload { get; private set; } = null!;
    public List<ShowcaseAsset> Assets { get; private set; } = [];
    public void MarkReady() => Ready = true;
    internal void Activate(DateTime now) => PublishedUtc = now;
}

public sealed class ShowcaseAsset
{
    private ShowcaseAsset() { }
    public ShowcaseAsset(Guid id, Guid editionId, string storageKey)
    { Id = id; EditionId = editionId; StorageKey = storageKey; }
    public Guid Id { get; private set; }
    public Guid EditionId { get; private set; }
    public string StorageKey { get; private set; } = null!;
    public int SizeBytes { get; private set; }
    public void Complete(int sizeBytes) => SizeBytes = sizeBytes;
}
