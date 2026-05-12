namespace CurateDS.Application.Collections.ListCollectionActivity;

public sealed record ListCollectionActivityQuery(string OwnerId, Guid CollectionId, int Page, int PageSize);
