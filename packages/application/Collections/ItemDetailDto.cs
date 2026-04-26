namespace CurateDS.Application.Collections;

public sealed record ItemDetailDto(
    Guid Id,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    string? LocationName,
    IReadOnlyList<TagDto> Tags,
    DateTime CreatedUtc,
    DateTime? UpdatedUtc,
    IReadOnlyList<ItemAttributeValueDto> AttributeValues);
