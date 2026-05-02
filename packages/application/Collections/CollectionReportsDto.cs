namespace CurateDS.Application.Collections;

public sealed record CollectionReportsDto(
    IReadOnlyList<ItemsByLocationDto> ItemsByLocation,
    IReadOnlyList<ItemsByTagDto> ItemsByTag);

public sealed record ItemsByLocationDto(Guid? LocationId, string LocationName, int Count);

public sealed record ItemsByTagDto(Guid TagId, string TagName, int Count);
