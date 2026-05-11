namespace CurateDS.Application.Collections.DeleteItemMedia;

public sealed record DeleteItemMediaCommand(
    string OwnerId,
    Guid CollectionId,
    Guid ItemId,
    Guid MediaAssetId);
