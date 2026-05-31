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
    Guid? ItemTypeId = null,
    TagMatchMode TagMatchMode = TagMatchMode.All);

public sealed record ListItemsAttributeFilter(string AttributeKey, string Value);

/// <summary>
/// Controls how multiple tag filters are combined.
/// <see cref="All"/> requires items to have every requested tag (default, backwards-compatible).
/// <see cref="Any"/> matches items that have at least one of the requested tags.
/// </summary>
public enum TagMatchMode
{
    All = 0,
    Any = 1
}
