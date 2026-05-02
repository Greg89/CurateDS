namespace CurateDS.Domain.Collections;

public sealed class ItemType : AuditableEntity
{
    private ItemType()
    {
        Name = null!;
    }

    private ItemType(
        Guid id,
        Guid collectionId,
        string name,
        int sortOrder,
        DateTime createdUtc,
        string createdBy)
    {
        Id = id;
        CollectionId = collectionId;
        Name = name;
        SortOrder = sortOrder;
        SetAuditOnCreate(createdUtc, createdBy);
    }

    public Guid Id { get; }

    public Guid CollectionId { get; private set; }

    public string Name { get; private set; }

    public int SortOrder { get; private set; }

    public static ItemType Create(
        Guid collectionId,
        string name,
        int sortOrder,
        DateTime createdUtc,
        string createdBy)
    {
        if (collectionId == Guid.Empty)
        {
            throw new ArgumentException("Collection ID is required.", nameof(collectionId));
        }

        ArgumentNullException.ThrowIfNull(name);

        var normalizedName = name.Trim();

        if (normalizedName.Length is < 2 or > 50)
        {
            throw new ArgumentException("Item type name must be between 2 and 50 characters.", nameof(name));
        }

        if (sortOrder < 0)
        {
            throw new ArgumentException("Sort order must be zero or greater.", nameof(sortOrder));
        }

        return new ItemType(Guid.NewGuid(), collectionId, normalizedName, sortOrder, createdUtc, createdBy);
    }
}
