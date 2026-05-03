namespace CurateDS.Api.Collections;

public sealed record CreateItemTypeRequest(string Name);

public sealed record ItemTypeResponse(
    Guid Id,
    Guid CollectionId,
    string Name,
    int SortOrder,
    DateTime CreatedUtc);
