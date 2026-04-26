namespace CurateDS.Domain.Collections;

public sealed class Tag : AuditableEntity
{
    private Tag()
    {
        Name = null!;
        Key = null!;
    }

    private Tag(Guid id, Guid ownerId, string name, string key, DateTime createdUtc, string createdBy)
    {
        Id = id;
        OwnerId = ownerId;
        Name = name;
        Key = key;
        SetAuditOnCreate(createdUtc, createdBy);
    }

    public Guid Id { get; }

    public Guid OwnerId { get; private set; }

    public string Name { get; private set; }

    public string Key { get; private set; }

    public static Tag Create(Guid ownerId, string name, DateTime createdUtc, string createdBy)
    {
        if (ownerId == Guid.Empty)
        {
            throw new ArgumentException("Owner ID is required.", nameof(ownerId));
        }

        ArgumentNullException.ThrowIfNull(name);

        var normalizedName = name.Trim();

        if (normalizedName.Length is < 2 or > 50)
        {
            throw new ArgumentException("Tag name must be between 2 and 50 characters.", nameof(name));
        }

        return new Tag(Guid.NewGuid(), ownerId, normalizedName, BuildKey(normalizedName), createdUtc, createdBy);
    }

    private static string BuildKey(string name)
    {
        var characters = name
            .ToLowerInvariant()
            .Select(character => char.IsLetterOrDigit(character) ? character : '-')
            .ToArray();

        var key = new string(characters).Trim('-');

        while (key.Contains("--", StringComparison.Ordinal))
        {
            key = key.Replace("--", "-", StringComparison.Ordinal);
        }

        return string.IsNullOrWhiteSpace(key) ? "tag" : key;
    }
}
