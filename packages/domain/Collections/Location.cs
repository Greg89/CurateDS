namespace CurateDS.Domain.Collections;

public sealed class Location : AuditableEntity
{
    private Location()
    {
        OwnerId = null!;
        Name = null!;
    }

    private Location(Guid id, string ownerId, string name, string? description, DateTime createdUtc, string createdBy)
    {
        Id = id;
        OwnerId = ownerId;
        Name = name;
        Description = description;
        SetAuditOnCreate(createdUtc, createdBy);
    }

    public Guid Id { get; }

    public string OwnerId { get; private set; }

    public string Name { get; private set; }

    public string? Description { get; private set; }

    public static Location Create(string ownerId, string name, string? description, DateTime createdUtc, string createdBy)
    {
        if (string.IsNullOrWhiteSpace(ownerId))
        {
            throw new ArgumentException("Owner ID is required.", nameof(ownerId));
        }

        ArgumentNullException.ThrowIfNull(name);

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

        return new Location(Guid.NewGuid(), ownerId.Trim(), normalizedName, normalizedDescription, createdUtc, createdBy);
    }

    /// <summary>
    /// Updates the location's name and description, stamping the update audit.
    /// </summary>
    public void Update(string name, string? description, DateTime updatedUtc, string updatedBy)
    {
        ArgumentNullException.ThrowIfNull(name);

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

        Name = normalizedName;
        Description = normalizedDescription;
        SetUpdated(updatedUtc, updatedBy);
    }
}
