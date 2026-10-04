using CurateDS.Application.Abstractions;

namespace CurateDS.Infrastructure.Storage;

public sealed class MediaStorageOptions
{
    public const string SectionName = "Storage";

    public string Endpoint { get; init; } = string.Empty;
    public string AccessKey { get; init; } = string.Empty;
    public string SecretKey { get; init; } = string.Empty;
    public string BucketName { get; init; } = string.Empty;

    /// <summary>
    /// When true, applies an anonymous s3:GetObject policy to the bucket at startup,
    /// making all objects publicly readable via their URL. This legacy opt-in is only for staged rollout;
    /// false alone does not remove an existing policy. Prefer EnforcePrivateReadPolicy after updating clients.
    /// </summary>
    public bool EnablePublicReadPolicy { get; init; } = false;

    /// <summary>Explicit rollout switch: removes any existing bucket policy. Overrides EnablePublicReadPolicy.
    /// Startup fails if private-policy enforcement fails. Deploy both clients' authenticated reads first.</summary>
    public bool EnforcePrivateReadPolicy { get; init; }
}
