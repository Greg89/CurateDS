namespace CurateDS.Application.Collections;

public sealed record ItemDetailDto(
    Guid Id,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    DateTime CreatedUtc,
    DateTime UpdatedUtc,
    IReadOnlyList<ItemAttributeValueDto> AttributeValues);
