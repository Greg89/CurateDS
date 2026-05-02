namespace CurateDS.Application.Collections;

public sealed record CollectionActivityEventDto(
    Guid EventId,
    Guid ItemId,
    string ItemName,
    string EventType,
    DateTime OccurredUtc,
    string OccurredBy,
    string? Notes);
