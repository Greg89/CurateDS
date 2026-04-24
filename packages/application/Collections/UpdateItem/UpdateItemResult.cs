namespace CurateDS.Application.Collections.UpdateItem;

public sealed record UpdateItemResult(
    Guid Id,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    DateTime CreatedUtc,
    DateTime UpdatedUtc,
    IReadOnlyList<ItemAttributeValueDto> AttributeValues);
