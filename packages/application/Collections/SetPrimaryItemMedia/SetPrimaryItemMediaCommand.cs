namespace CurateDS.Application.Collections.SetPrimaryItemMedia;

public sealed record SetPrimaryItemMediaCommand(
    Guid OwnerId,
    Guid CollectionId,
    Guid ItemId,
    Guid MediaAssetId);
