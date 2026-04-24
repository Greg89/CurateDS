namespace CurateDS.Application.Collections.UpdateItem;

public sealed record UpdateItemCommand(
    Guid OwnerId,
    Guid CollectionId,
    Guid ItemId,
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    IReadOnlyList<Guid> TagIds,
    IReadOnlyList<CreateItem.CreateItemAttributeValueInput> AttributeValues);
