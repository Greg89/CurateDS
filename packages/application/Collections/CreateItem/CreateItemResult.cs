namespace CurateDS.Application.Collections.CreateItem;

public sealed record CreateItemResult(
    Guid Id,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    DateTime CreatedUtc,
    DateTime UpdatedUtc,
    IReadOnlyList<ItemAttributeValueDto> AttributeValues);
