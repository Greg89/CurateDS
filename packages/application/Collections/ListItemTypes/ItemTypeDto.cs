namespace CurateDS.Application.Collections.ListItemTypes;

public sealed record ItemTypeDto(
    Guid Id,
    Guid CollectionId,
    string Name,
    int SortOrder,
    DateTime CreatedUtc);
