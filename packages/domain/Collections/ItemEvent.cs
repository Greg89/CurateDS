namespace CurateDS.Domain.Collections;

public sealed class ItemEvent
{
    // Parameterless constructor for EF Core materialization.
    private ItemEvent()
    {
        OccurredBy = null!;
    }

    private ItemEvent(
        Guid id,
        Guid itemId,
        Guid collectionId,
        ItemEventType eventType,
        DateTime occurredUtc,
        string occurredBy,
        string? notes)
    {
        Id = id;
        ItemId = itemId;
        CollectionId = collectionId;
        EventType = eventType;
        OccurredUtc = occurredUtc;
        OccurredBy = occurredBy;
        Notes = notes;
    }

    public Guid Id { get; private set; }

    public Guid ItemId { get; private set; }

    public Guid CollectionId { get; private set; }

    public ItemEventType EventType { get; private set; }

    public DateTime OccurredUtc { get; private set; }

    public string OccurredBy { get; private set; }

    public string? Notes { get; private set; }

    public static ItemEvent Record(
        Guid itemId,
        Guid collectionId,
        ItemEventType eventType,
        DateTime occurredUtc,
        string occurredBy,
        string? notes = null)
    {
        return new ItemEvent(Guid.NewGuid(), itemId, collectionId, eventType, occurredUtc, occurredBy, notes);
    }
}
