namespace CurateDS.Domain.Collections;

public sealed class Collection
{
    private Collection()
    {
        Name = null!;
    }

    private Collection(Guid id, Guid ownerId, string name, DateTime createdUtc)
    {
        Id = id;
        OwnerId = ownerId;
        Name = name;
        CreatedUtc = createdUtc;
    }

    public Guid Id { get; }

    public Guid OwnerId { get; private set; }

    public string Name { get; private set; }

    public DateTime CreatedUtc { get; private set; }

    public static Collection Create(Guid ownerId, string name, DateTime createdUtc)
    {
        if (ownerId == Guid.Empty)
        {
            throw new ArgumentException("Owner ID is required.", nameof(ownerId));
        }

        var normalizedName = name.Trim();

        if (normalizedName.Length is < 3 or > 100)
        {
            throw new ArgumentException("Collection name must be between 3 and 100 characters.", nameof(name));
        }

        return new Collection(Guid.NewGuid(), ownerId, normalizedName, createdUtc);
    }
}
