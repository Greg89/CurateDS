namespace CurateDS.Application.Collections;

/// <summary>
/// Raw item-summary projection returned by <see cref="Abstractions.Persistence.IItemRepository.QueryAsync"/>.
/// Repositories deal in storage keys; the application layer maps the key to a public URL before
/// returning <see cref="ItemSummaryDto"/> to callers. Keeping these as distinct types prevents a
/// raw storage key from ever leaking into a field named <c>PrimaryImageUrl</c>.
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
    string? PrimaryImageStorageKey);
