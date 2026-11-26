namespace CurateDS.Application.Collections;

public sealed record CollectionInsightsDto(
    Guid CollectionId,
    CollectionSummaryDto Summary,
    CollectionReportsDto Reports,
    IReadOnlyList<ItemsByTypeDto> ItemsByType,
    IReadOnlyList<ItemsAddedMonthDto> AddedByMonth,
    AttributeBreakdownDto? Attribute);
public sealed record ItemsByTypeDto(Guid? ItemTypeId, string Name, int Count);
public sealed record ItemsAddedMonthDto(DateTime FromUtc, DateTime ToUtc, int Count);
public sealed record AttributeBreakdownDto(Guid DefinitionId, string Key, string Name, int TotalWithValue, IReadOnlyList<AttributeBucketDto> Values);
public sealed record AttributeBucketDto(string Value, int Count);
