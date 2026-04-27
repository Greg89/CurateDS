namespace CurateDS.Application.Collections.DeleteItemMedia;

public sealed record DeleteItemMediaCommand(
    Guid OwnerId,
    Guid CollectionId,
    Guid ItemId,
    Guid MediaAssetId);
