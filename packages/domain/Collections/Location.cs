namespace CurateDS.Domain.Collections;

public sealed class Location
{
    private Location()
    {
        Name = null!;
    }

    private Location(Guid id, Guid ownerId, string name, string? description, DateTime createdUtc)
    {
        Id = id;
        OwnerId = ownerId;
        Name = name;
        Description = description;
        CreatedUtc = createdUtc;
    }

    public Guid Id { get; }

    public Guid OwnerId { get; private set; }

    public string Name { get; private set; }

    public string? Description { get; private set; }

    public DateTime CreatedUtc { get; private set; }

    public static Location Create(Guid ownerId, string name, string? description, DateTime createdUtc)
    {
        if (ownerId == Guid.Empty)
        {
            throw new ArgumentException("Owner ID is required.", nameof(ownerId));
        }

        var normalizedName = name.Trim();

        if (normalizedName.Length is < 2 or > 80)
        {
            throw new ArgumentException("Location name must be between 2 and 80 characters.", nameof(name));
        }

        var normalizedDescription = string.IsNullOrWhiteSpace(description) ? null : description.Trim();

        if (normalizedDescription?.Length > 240)
        {
            throw new ArgumentException("Location description must be 240 characters or fewer.", nameof(description));
        }

        return new Location(Guid.NewGuid(), ownerId, normalizedName, normalizedDescription, createdUtc);
    }
}
