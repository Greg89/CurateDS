namespace CurateDS.Domain.Collections;

public sealed class SavedView
{
    private SavedView()
    {
        OwnerId = null!;
        Name = null!;
        FiltersJson = null!;
    }

    private SavedView(Guid id, Guid collectionId, string ownerId, string name, string filtersJson, DateTime createdUtc)
    {
        Id = id;
        CollectionId = collectionId;
        OwnerId = ownerId;
        Name = name;
        FiltersJson = filtersJson;
        CreatedUtc = createdUtc;
    }

    public Guid Id { get; }

    public Guid CollectionId { get; private set; }

    public string OwnerId { get; private set; }

    public string Name { get; private set; }

    public string FiltersJson { get; private set; }

    public DateTime CreatedUtc { get; private set; }

    public static SavedView Create(Guid collectionId, string ownerId, string name, string filtersJson, DateTime createdUtc)
    {
        if (collectionId == Guid.Empty)
            throw new ArgumentException("Collection ID is required.", nameof(collectionId));

        if (string.IsNullOrWhiteSpace(ownerId))
            throw new ArgumentException("Owner ID is required.", nameof(ownerId));

        var normalizedName = name.Trim();

        if (normalizedName.Length is < 1 or > 100)
            throw new ArgumentException("Saved view name must be between 1 and 100 characters.", nameof(name));

        return new SavedView(Guid.NewGuid(), collectionId, ownerId.Trim(), normalizedName, filtersJson, createdUtc);
    }
}
