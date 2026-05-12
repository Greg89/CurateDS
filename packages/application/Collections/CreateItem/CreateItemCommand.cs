namespace CurateDS.Application.Collections.CreateItem;

public sealed record CreateItemCommand(
    string OwnerId,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    Guid? ItemTypeId,
    IReadOnlyList<Guid> TagIds,
    IReadOnlyList<CreateItemAttributeValueInput> AttributeValues);
