namespace CurateDS.Application.Collections.CreateItem;

public sealed record CreateItemCommand(
    Guid OwnerId,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    IReadOnlyList<Guid> TagIds,
    IReadOnlyList<CreateItemAttributeValueInput> AttributeValues);
