namespace CurateDS.Application.Collections.GetItemDetail;

public sealed record GetItemDetailQuery(Guid OwnerId, Guid CollectionId, Guid ItemId);
