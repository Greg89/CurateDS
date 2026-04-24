namespace CurateDS.Application.Collections.ListItems;

public sealed record ListItemsQuery(
    Guid OwnerId,
    Guid CollectionId,
    string? SearchText,
    Guid? LocationId,
    IReadOnlyList<Guid> TagIds);
