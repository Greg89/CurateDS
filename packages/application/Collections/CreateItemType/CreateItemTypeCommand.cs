namespace CurateDS.Application.Collections.CreateItemType;

public sealed record CreateItemTypeCommand(
    Guid OwnerId,
    Guid CollectionId,
    string Name);
