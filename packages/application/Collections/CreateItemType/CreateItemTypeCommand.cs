namespace CurateDS.Application.Collections.CreateItemType;

public sealed record CreateItemTypeCommand(
    string OwnerId,
    Guid CollectionId,
    string Name);
