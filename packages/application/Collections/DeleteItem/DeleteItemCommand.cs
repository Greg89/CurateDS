namespace CurateDS.Application.Collections.DeleteItem;

public sealed record DeleteItemCommand(Guid OwnerId, Guid CollectionId, Guid ItemId);
