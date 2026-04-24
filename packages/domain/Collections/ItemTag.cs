namespace CurateDS.Domain.Collections;

public sealed class ItemTag
{
    private ItemTag()
    {
    }

    private ItemTag(Guid itemId, Guid tagId)
    {
        ItemId = itemId;
        TagId = tagId;
    }

    public Guid ItemId { get; private set; }

    public Guid TagId { get; private set; }

    public static ItemTag Create(Guid itemId, Guid tagId)
    {
        if (itemId == Guid.Empty)
        {
            throw new ArgumentException("Item ID is required.", nameof(itemId));
        }

        if (tagId == Guid.Empty)
        {
            throw new ArgumentException("Tag ID is required.", nameof(tagId));
        }

        return new ItemTag(itemId, tagId);
    }
}
