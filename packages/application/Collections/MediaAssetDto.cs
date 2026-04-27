namespace CurateDS.Application.Collections;

public sealed record MediaAssetDto(
    Guid Id,
    string Url,
    string ContentType,
    string FileName,
    long SizeBytes,
    bool IsPrimary,
    DateTime UploadedUtc);
