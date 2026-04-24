namespace CurateDS.Domain.Collections;

public sealed class Item
{
    private Item()
    {
        Name = null!;
        AttributeValues = [];
        ItemTags = [];
    }

    private Item(
        Guid id,
        Guid collectionId,
        string name,
        string? description,
        int quantity,
        DateTime createdUtc,
        DateTime updatedUtc)
    {
        Id = id;
        CollectionId = collectionId;
        Name = name;
        Description = description;
        Quantity = quantity;
        CreatedUtc = createdUtc;
        UpdatedUtc = updatedUtc;
        AttributeValues = [];
        ItemTags = [];
    }

    public Guid Id { get; }

    public Guid CollectionId { get; private set; }

    public string Name { get; private set; }

    public string? Description { get; private set; }

    public int Quantity { get; private set; }

    public Guid? LocationId { get; private set; }

    public DateTime CreatedUtc { get; private set; }

    public DateTime UpdatedUtc { get; private set; }

    public List<ItemAttributeValue> AttributeValues { get; private set; }

    public List<ItemTag> ItemTags { get; private set; }

    public static Item Create(
        Guid collectionId,
        string name,
        string? description,
        int quantity,
        DateTime createdUtc)
    {
        if (collectionId == Guid.Empty)
        {
            throw new ArgumentException("Collection ID is required.", nameof(collectionId));
        }

        ArgumentNullException.ThrowIfNull(name);

        var normalizedName = name.Trim();

        if (normalizedName.Length is < 3 or > 120)
        {
            throw new ArgumentException("Item name must be between 3 and 120 characters.", nameof(name));
        }

        var normalizedDescription = NormalizeDescription(description);

        if (quantity is < 1 or > 9999)
        {
            throw new ArgumentException("Quantity must be between 1 and 9999.", nameof(quantity));
        }

        return new Item(
            Guid.NewGuid(),
            collectionId,
            normalizedName,
            normalizedDescription,
            quantity,
            createdUtc,
            createdUtc);
    }

    public void AddAttributeValue(ItemAttributeValue attributeValue)
    {
        if (attributeValue.ItemId != Id)
        {
            throw new ArgumentException("Attribute value must belong to the item.", nameof(attributeValue));
        }

        AttributeValues.Add(attributeValue);
        UpdatedUtc = DateTime.UtcNow;
    }

    public void UpdateDetails(string name, string? description, int quantity, DateTime updatedUtc)
    {
        ArgumentNullException.ThrowIfNull(name);

        var normalizedName = name.Trim();

        if (normalizedName.Length is < 3 or > 120)
        {
            throw new ArgumentException("Item name must be between 3 and 120 characters.", nameof(name));
        }

        if (quantity is < 1 or > 9999)
        {
            throw new ArgumentException("Quantity must be between 1 and 9999.", nameof(quantity));
        }

        Name = normalizedName;
        Description = NormalizeDescription(description);
        Quantity = quantity;
        UpdatedUtc = updatedUtc;
    }

    public void ReplaceAttributeValues(IEnumerable<ItemAttributeValue> attributeValues, DateTime updatedUtc)
    {
        var normalizedValues = attributeValues.ToList();

        if (normalizedValues.Any(attributeValue => attributeValue.ItemId != Id))
        {
            throw new ArgumentException("All attribute values must belong to the item.", nameof(attributeValues));
        }

        AttributeValues.Clear();
        AttributeValues.AddRange(normalizedValues);
        UpdatedUtc = updatedUtc;
    }

    public void AssignLocation(Guid? locationId, DateTime updatedUtc)
    {
        LocationId = locationId;
        UpdatedUtc = updatedUtc;
    }

    public void ReplaceTags(IEnumerable<ItemTag> itemTags, DateTime updatedUtc)
    {
        var normalizedTags = itemTags.ToList();

        if (normalizedTags.Any(itemTag => itemTag.ItemId != Id))
        {
            throw new ArgumentException("All tags must belong to the item.", nameof(itemTags));
        }

        ItemTags.Clear();
        ItemTags.AddRange(normalizedTags);
        UpdatedUtc = updatedUtc;
    }

    public void RemoveAttributeValue(Guid attributeDefinitionId, DateTime updatedUtc)
    {
        var existingAttributeValue = AttributeValues.SingleOrDefault(
            attributeValue => attributeValue.AttributeDefinitionId == attributeDefinitionId);

        if (existingAttributeValue is null)
        {
            return;
        }

        AttributeValues.Remove(existingAttributeValue);
        UpdatedUtc = updatedUtc;
    }

    private static string? NormalizeDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return null;
        }

        var normalizedDescription = description.Trim();

        if (normalizedDescription.Length > 2000)
        {
            throw new ArgumentException("Description must be 2000 characters or fewer.", nameof(description));
        }

        return normalizedDescription;
    }
}
