namespace CurateDS.Api.Collections;

public sealed class ListItemsRequest
{
    public string? SearchText { get; init; }

    public Guid? LocationId { get; init; }

    public Guid[]? TagIds { get; init; }
}
