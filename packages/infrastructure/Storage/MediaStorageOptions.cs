using CurateDS.Application.Abstractions;

namespace CurateDS.Infrastructure.Storage;

public sealed class MediaStorageOptions
{
    public const string SectionName = "Storage";

    public string Endpoint { get; init; } = string.Empty;
    public string AccessKey { get; init; } = string.Empty;
    public string SecretKey { get; init; } = string.Empty;
    public string BucketName { get; init; } = string.Empty;
    public string PublicBaseUrl { get; init; } = string.Empty;
}
