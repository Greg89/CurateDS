namespace CurateDS.Api.Collections;

public sealed class ListItemsRequest
{
    public string? SearchText { get; init; }

    public Guid? LocationId { get; init; }

    public Guid[]? TagIds { get; init; }

    public string[]? AttributeFilters { get; init; }

    public string? SortBy { get; init; }

    public string? SortDirection { get; init; }

    public int? Page { get; init; }

    public int? PageSize { get; init; }

    public int? MinQuantity { get; init; }

    public int? MaxQuantity { get; init; }

    public DateTime? CreatedAfter { get; init; }

    public DateTime? CreatedBefore { get; init; }

    public bool? HasNoLocation { get; init; }

    public bool? HasNoTags { get; init; }

    public Guid? ItemTypeId { get; init; }

    /// <summary>
    /// How to combine multiple tag filters. "all" (default) requires every tag; "any" matches at least one.
    /// </summary>
    public string? TagMatchMode { get; init; }
}
