namespace CurateDS.Application.Collections.UploadItemMedia;

public sealed record UploadItemMediaCommand(
    string OwnerId,
    Guid CollectionId,
    Guid ItemId,
    Stream Content,
    string ContentType,
    string FileName,
    long SizeBytes);
