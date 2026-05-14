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

    /// <summary>
    /// When true, applies an anonymous s3:GetObject policy to the bucket at startup,
    /// making all objects publicly readable via their URL. Set to false if your
    /// deployment uses pre-signed URLs or a CDN with private bucket access.
    /// </summary>
    public bool EnablePublicReadPolicy { get; init; } = true;
}
