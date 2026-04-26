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
}
