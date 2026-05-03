namespace CurateDS.Application.Collections.DeleteItemType;

public sealed record DeleteItemTypeCommand(Guid OwnerId, Guid CollectionId, Guid ItemTypeId);
