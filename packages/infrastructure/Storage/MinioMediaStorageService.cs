using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using CurateDS.Application.Abstractions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace CurateDS.Infrastructure.Storage;

public sealed class MinioMediaStorageService : IMediaStorageService
{
    private readonly MediaStorageOptions _options;
    private readonly string _environment;

    public MinioMediaStorageService(IOptions<MediaStorageOptions> options, IHostEnvironment environment)
    {
        _options = options.Value;
        _environment = environment.EnvironmentName;
    }

    public async Task<string> UploadAsync(
        Guid collectionId,
        Guid itemId,
        Stream content,
        string contentType,
        string fileExtension,
        CancellationToken ct)
    {
        var key = $"{_environment}/collections/{collectionId}/items/{itemId}/{Guid.NewGuid()}.{fileExtension.TrimStart('.')}";

        // Buffer non-seekable streams so the SDK can send a single fixed-Content-Length
        // HTTP PUT. Streaming uploads with unknown length force Transfer-Encoding: chunked,
        // which Railway's HTTP proxy in front of MinIO does not handle reliably (502).
        Stream uploadStream = content;
        MemoryStream? buffer = null;
        if (!content.CanSeek)
        {
            buffer = new MemoryStream();
            await content.CopyToAsync(buffer, ct);
            buffer.Position = 0;
            uploadStream = buffer;
        }

        try
        {
            using var client = CreateClient();

            // The SDK refuses DisablePayloadSigning=true over plain HTTP. That's only
            // a concern when we're talking to MinIO via Railway's *public* HTTPS edge
            // proxy (which can't parse aws-chunked / streaming-signed payloads and
            // returns 502). When the endpoint is HTTP — i.e. the *.railway.internal
            // private hostname — there is no proxy in the path, so a normal signed
            // PUT works and we leave payload signing on.
            var endpointIsHttps = !string.IsNullOrEmpty(_options.Endpoint)
                && _options.Endpoint.StartsWith("https://", StringComparison.OrdinalIgnoreCase);

            var request = new PutObjectRequest
            {
                BucketName = _options.BucketName,
                Key = key,
                InputStream = uploadStream,
                ContentType = contentType,
                // Always send a single fixed-Content-Length PUT instead of aws-chunked
                // streaming. MinIO does not advertise full support for the AWS chunked
                // upload format and Railway's edge proxy mangles it outright.
                UseChunkEncoding = false,
                // Skip the default flexible-checksum (CRC32) header — MinIO rejects it.
                DisableDefaultChecksumValidation = true,
                // Only swap to UNSIGNED-PAYLOAD when we can satisfy the SDK's HTTPS
                // requirement. This is the path that bypasses Railway's edge proxy.
                DisablePayloadSigning = endpointIsHttps ? true : null
            };

            await client.PutObjectAsync(request, ct);
            return key;
        }
        finally
        {
            buffer?.Dispose();
        }
    }

    public async Task DeleteAsync(string storageKey, CancellationToken ct)
    {
        try
        {
            using var client = CreateClient();
            await client.DeleteObjectAsync(_options.BucketName, storageKey, ct);
        }
        catch (AmazonS3Exception ex) when (ex.ErrorCode == "NoSuchKey")
        {
            // Already gone — treat as success
        }
    }

    public string GetPublicUrl(string storageKey)
        => $"{_options.PublicBaseUrl.TrimEnd('/')}/{_options.BucketName}/{storageKey}";

    private AmazonS3Client CreateClient()
    {
        var credentials = new BasicAWSCredentials(_options.AccessKey, _options.SecretKey);
        var config = new AmazonS3Config
        {
            ServiceURL = _options.Endpoint,
            ForcePathStyle = true,
            AuthenticationRegion = "us-east-1",
            // SDK v4 (4.0.23+) sends CRC32 checksums on PutObject by default.
            // MinIO does not support flexible checksums and returns 502 via Railway's proxy.
            // Revert to the pre-4.0.23 behaviour of only computing checksums when required.
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED
        };
        return new AmazonS3Client(credentials, config);
    }
}
