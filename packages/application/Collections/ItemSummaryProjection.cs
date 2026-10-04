namespace CurateDS.Application.Collections;

/// <summary>
/// Raw item-summary projection returned by <see cref="Abstractions.Persistence.IItemRepository.QueryAsync"/>.
/// Contains only the primary asset ID; object keys never enter the response projection.
/// </summary>
public sealed record ItemSummaryProjection(
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
    Guid? PrimaryImageAssetId);
