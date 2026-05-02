namespace CurateDS.Application.Collections.CreateItemType;

public sealed record CreateItemTypeResult(
    Guid Id,
    Guid CollectionId,
    string Name,
    int SortOrder,
    DateTime CreatedUtc);
