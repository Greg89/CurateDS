namespace CurateDS.Application.Collections.DeleteItemType;

public sealed record DeleteItemTypeCommand(string OwnerId, Guid CollectionId, Guid ItemTypeId);
