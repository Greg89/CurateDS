namespace CurateDS.Application.Collections.ListItems;

public sealed record ListItemsQuery(
    string OwnerId,
    Guid CollectionId,
    string? SearchText,
    Guid? LocationId,
    IReadOnlyList<Guid> TagIds,
    IReadOnlyList<ListItemsAttributeFilter> AttributeFilters,
    string? SortBy,
    string? SortDirection,
    int Page,
    int PageSize,
    int? MinQuantity = null,
    int? MaxQuantity = null,
    DateTime? CreatedAfter = null,
    DateTime? CreatedBefore = null,
    bool HasNoLocation = false,
    bool HasNoTags = false,
    Guid? ItemTypeId = null);

public sealed record ListItemsAttributeFilter(string AttributeKey, string Value);
