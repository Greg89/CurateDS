using CurateDS.Domain.Collections;

namespace CurateDS.Application.Collections;

public sealed record ItemEventDto(
    Guid Id,
    Guid ItemId,
    Guid CollectionId,
    ItemEventType EventType,
    DateTime OccurredUtc,
    string OccurredBy,
    string? Notes);
