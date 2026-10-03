namespace CurateDS.Domain.Collections;

public sealed class Collection : AuditableEntity
{
    private Collection()
    {
        OwnerId = null!;
        Name = null!;
    }

    private Collection(Guid id, string ownerId, string name, DateTime createdUtc, string createdBy)
    {
        Id = id;
        OwnerId = ownerId;
        Name = name;
        SetAuditOnCreate(createdUtc, createdBy);
    }

    public Guid Id { get; }

    public string OwnerId { get; private set; }

    public string Name { get; private set; }

    public string? Category { get; private set; }
    public string? Description { get; private set; }
    public string? CoverImageUrl { get; private set; }
    public string? Color { get; private set; }

    public static bool IsValidCoverImageUrl(string? value) =>
        string.IsNullOrWhiteSpace(value) ||
        (Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri) &&
         uri.Scheme == Uri.UriSchemeHttps && string.IsNullOrEmpty(uri.UserInfo));

    public static Collection Create(string ownerId, string name, DateTime createdUtc, string createdBy,
        string? category = null, string? description = null, string? coverImageUrl = null, string? color = null)
    {
        if (string.IsNullOrWhiteSpace(ownerId))
        {
            throw new ArgumentException("Owner ID is required.", nameof(ownerId));
        }

        var collection = new Collection(Guid.NewGuid(), ownerId.Trim(), name, createdUtc, createdBy);
        collection.SetIdentity(name, category, description, coverImageUrl, color);
        return collection;
    }

    public void UpdateIdentity(string name, string? category, string? description,
        string? coverImageUrl, string? color, DateTime updatedUtc, string updatedBy)
    {
        SetIdentity(name, category, description, coverImageUrl, color);
        SetUpdated(updatedUtc, updatedBy);
    }

    private void SetIdentity(string name, string? category, string? description, string? coverImageUrl, string? color)
    {
        var normalizedName = name?.Trim() ?? "";
        if (normalizedName.Length is < 3 or > 100)
            throw new ArgumentException("Collection name must be between 3 and 100 characters.", nameof(name));

        static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        category = Normalize(category);
        description = Normalize(description);
        coverImageUrl = Normalize(coverImageUrl);
        color = Normalize(color);
        if (category?.Length > 100 || description?.Length > 1000 || coverImageUrl?.Length > 2048 ||
            !IsValidCoverImageUrl(coverImageUrl) || color is not (null or "forest" or "clay" or "slate"))
            throw new ArgumentException("Collection identity is invalid.");

        // Validate the whole identity before mutating any field.
        Name = normalizedName;
        Category = category;
        Description = description;
        CoverImageUrl = coverImageUrl;
        Color = color;
    }
}
