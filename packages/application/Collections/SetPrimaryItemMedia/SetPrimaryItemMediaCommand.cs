namespace CurateDS.Application.Collections.SetPrimaryItemMedia;

public sealed record SetPrimaryItemMediaCommand(
    string OwnerId,
    Guid CollectionId,
    Guid ItemId,
    Guid MediaAssetId);
