using CurateDS.Application.Collections.Shared;

namespace CurateDS.Application.Collections.UpdateItem;

public sealed record UpdateItemCommand(
    string OwnerId,
    Guid CollectionId,
    Guid ItemId,
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    Guid? ItemTypeId,
    IReadOnlyList<Guid> TagIds,
    IReadOnlyList<AttributeValueInput> AttributeValues);
