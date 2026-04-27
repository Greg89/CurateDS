namespace CurateDS.Application.Collections;

public sealed record ItemSummaryDto(
    Guid Id,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    string? LocationName,
    IReadOnlyList<string> Tags,
    int AttributeValueCount,
    DateTime CreatedUtc,
    DateTime? UpdatedUtc,
    string? PrimaryImageUrl);
