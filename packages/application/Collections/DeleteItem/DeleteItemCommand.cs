namespace CurateDS.Application.Collections.DeleteItem;

public sealed record DeleteItemCommand(string OwnerId, Guid CollectionId, Guid ItemId);
