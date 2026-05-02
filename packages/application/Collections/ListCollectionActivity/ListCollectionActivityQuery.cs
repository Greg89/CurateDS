namespace CurateDS.Application.Collections.ListCollectionActivity;

public sealed record ListCollectionActivityQuery(Guid OwnerId, Guid CollectionId, int Page, int PageSize);
