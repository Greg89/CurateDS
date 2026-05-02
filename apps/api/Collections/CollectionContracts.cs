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
