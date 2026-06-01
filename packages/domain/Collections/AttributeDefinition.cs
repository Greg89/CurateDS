namespace CurateDS.Domain.Collections;

public sealed class AttributeDefinition : AuditableEntity
{
    private AttributeDefinition()
    {
        Name = null!;
        Key = null!;
    }

    private AttributeDefinition(
        Guid id,
        Guid collectionId,
        string name,
        string key,
        AttributeDataType dataType,
        bool isRequired,
        bool isFilterable,
        int sortOrder,
        Guid? itemTypeId,
        DateTime createdUtc,
        string createdBy)
    {
        Id = id;
        CollectionId = collectionId;
        Name = name;
        Key = key;
        DataType = dataType;
        IsRequired = isRequired;
        IsFilterable = isFilterable;
        SortOrder = sortOrder;
        ItemTypeId = itemTypeId;
        SetAuditOnCreate(createdUtc, createdBy);
    }

    public Guid Id { get; }

    public Guid CollectionId { get; private set; }

    public string Name { get; private set; }

    public string Key { get; private set; }

    public AttributeDataType DataType { get; private set; }

    public bool IsRequired { get; private set; }

    public bool IsFilterable { get; private set; }

    public int SortOrder { get; private set; }

    public Guid? ItemTypeId { get; private set; }

    public static AttributeDefinition Create(
        Guid collectionId,
        string name,
        AttributeDataType dataType,
        bool isRequired,
        bool isFilterable,
        int sortOrder,
        DateTime createdUtc,
        string createdBy,
        Guid? itemTypeId = null)
    {
        if (collectionId == Guid.Empty)
        {
            throw new ArgumentException("Collection ID is required.", nameof(collectionId));
        }

        var normalizedName = name.Trim();

        if (normalizedName.Length is < 2 or > 60)
        {
            throw new ArgumentException("Attribute name must be between 2 and 60 characters.", nameof(name));
        }

        if (sortOrder < 0)
        {
            throw new ArgumentException("Sort order must be zero or greater.", nameof(sortOrder));
        }

        return new AttributeDefinition(
            Guid.NewGuid(),
            collectionId,
            normalizedName,
            BuildKey(normalizedName),
            dataType,
            isRequired,
            isFilterable,
            sortOrder,
            itemTypeId,
            createdUtc,
            createdBy);
    }

    /// <summary>
    /// Updates the editable fields of an attribute definition. <see cref="DataType"/> is intentionally
    /// immutable post-creation because existing item attribute values may not validate against a new type.
    /// </summary>
    public void Update(
        string name,
        bool isRequired,
        bool isFilterable,
        Guid? itemTypeId,
        DateTime updatedUtc,
        string updatedBy)
    {
        ArgumentNullException.ThrowIfNull(name);

        var normalizedName = name.Trim();

        if (normalizedName.Length is < 2 or > 60)
        {
            throw new ArgumentException("Attribute name must be between 2 and 60 characters.", nameof(name));
        }

        Name = normalizedName;
        Key = BuildKey(normalizedName);
        IsRequired = isRequired;
        IsFilterable = isFilterable;
        ItemTypeId = itemTypeId;
        SetUpdated(updatedUtc, updatedBy);
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

        return string.IsNullOrWhiteSpace(key) ? "attribute" : key;
    }
}
