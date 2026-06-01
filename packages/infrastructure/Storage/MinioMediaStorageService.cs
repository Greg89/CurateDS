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

            var request = new PutObjectRequest
            {
                BucketName = _options.BucketName,
                Key = key,
                InputStream = uploadStream,
                ContentType = contentType,
                // MinIO behind Railway's HTTP proxy does not tolerate the AWS SDK's default
                // SigV4 chunked-payload streaming upload (Content-Encoding: aws-chunked +
                // STREAMING-AWS4-HMAC-SHA256-PAYLOAD). The proxy returns 502 BadGateway before
                // the request ever reaches MinIO. Disable chunk encoding and payload signing
                // so the SDK sends a plain fixed-length PUT with UNSIGNED-PAYLOAD. The S3
                // request itself is still SigV4-signed; only the body bytes are unsigned.
                UseChunkEncoding = false,
                DisablePayloadSigning = true,
                DisableDefaultChecksumValidation = true
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
