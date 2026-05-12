namespace CurateDS.Application.Collections.GetItemDetail;

public sealed record GetItemDetailQuery(string OwnerId, Guid CollectionId, Guid ItemId);
