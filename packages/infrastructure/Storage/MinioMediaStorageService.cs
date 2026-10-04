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
        CancellationToken cancellationToken)
    {
        var key = $"{_environment}/collections/{collectionId}/items/{itemId}/{Guid.NewGuid()}.{fileExtension.TrimStart('.')}";

        // Buffer non-seekable streams so the SDK can send a single fixed-Content-Length
        // HTTP PUT. Streaming uploads with unknown length force Transfer-Encoding: chunked,
        // which Railway's HTTP proxy in front of MinIO does not handle reliably (502).
        // The buffer is owned by this method (not the caller's stream), so we wrap it
        // in `using` so it's always disposed — including on exceptions inside the SDK.
        using var buffer = content.CanSeek ? null : new MemoryStream();
        Stream uploadStream = content;
        if (buffer is not null)
        {
            await content.CopyToAsync(buffer, cancellationToken);
            buffer.Position = 0;
            uploadStream = buffer;
        }

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

        await client.PutObjectAsync(request, cancellationToken);
        return key;
    }

    public async Task DeleteAsync(string storageKey, CancellationToken cancellationToken)
    {
        try
        {
            using var client = CreateClient();
            await client.DeleteObjectAsync(_options.BucketName, storageKey, cancellationToken);
        }
        catch (AmazonS3Exception ex) when (ex.ErrorCode == "NoSuchKey")
        {
            // Already gone — treat as success
        }
    }

    public async Task<byte[]?> ReadAsync(string storageKey, long maximumBytes, CancellationToken cancellationToken)
    {
        if (maximumBytes is <= 0 or > 20 * 1024 * 1024) throw new ArgumentOutOfRangeException(nameof(maximumBytes));
        using var client = CreateClient();
        try
        {
            using var response = await client.GetObjectAsync(_options.BucketName, storageKey, cancellationToken);
            if (response.ContentLength > maximumBytes) throw new InvalidDataException("Media exceeds its size limit.");
            using var output = new MemoryStream();
            var buffer = new byte[81920];
            int read;
            while ((read = await response.ResponseStream.ReadAsync(buffer, cancellationToken)) > 0)
            {
                if (output.Length + read > maximumBytes) throw new InvalidDataException("Media exceeds its size limit.");
                await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            }
            return output.ToArray();
        }
        catch (AmazonS3Exception error) when (error.ErrorCode == "NoSuchKey") { return null; }
        catch (AmazonS3Exception error) { throw new IOException("Media storage is unavailable.", error); }
    }

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
