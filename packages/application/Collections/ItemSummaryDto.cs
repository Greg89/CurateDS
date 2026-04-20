namespace CurateDS.Application.Collections;

public sealed record ItemSummaryDto(
    Guid Id,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    int AttributeValueCount,
    DateTime CreatedUtc,
    DateTime UpdatedUtc);
