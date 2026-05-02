namespace CurateDS.Api.Collections;

public sealed record CreateCollectionRequest(string Name);

public sealed record CollectionResponse(Guid Id, string Name, DateTime CreatedUtc);

public sealed record CollectionSummaryResponse(
    Guid CollectionId,
    int TotalItems,
    int TotalAttributeDefinitions,
    int TagsUsed,
    int LocationsUsed,
    int ItemsWithNoLocation,
    int ItemsWithNoTags,
    int TotalMediaAssets);

public sealed record CollectionReportsResponse(
    IReadOnlyList<ItemsByLocationResponse> ItemsByLocation,
    IReadOnlyList<ItemsByTagResponse> ItemsByTag);

public sealed record ItemsByLocationResponse(Guid? LocationId, string LocationName, int Count);

public sealed record ItemsByTagResponse(Guid TagId, string TagName, int Count);

public sealed record CollectionActivityEventResponse(
    Guid EventId,
    Guid ItemId,
    string ItemName,
    string EventType,
    DateTime OccurredUtc,
    string OccurredBy,
    string? Notes);

public sealed record PagedCollectionActivityResponse(
    IReadOnlyList<CollectionActivityEventResponse> Events,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);

public sealed record SavedViewResponse(Guid Id, Guid CollectionId, string Name, string FiltersJson, DateTime CreatedUtc);

public sealed record CreateSavedViewRequest(string Name, string FiltersJson);
