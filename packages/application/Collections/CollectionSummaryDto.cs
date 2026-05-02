namespace CurateDS.Application.Collections;

public sealed record CollectionSummaryDto(
    Guid CollectionId,
    int TotalItems,
    int TotalAttributeDefinitions,
    int TagsUsed,
    int LocationsUsed,
    int ItemsWithNoLocation,
    int ItemsWithNoTags,
    int TotalMediaAssets);
