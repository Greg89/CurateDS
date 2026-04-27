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

        using var client = CreateClient();
        var request = new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = key,
            InputStream = content,
            ContentType = contentType
        };

        await client.PutObjectAsync(request, ct);
        return key;
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
            AuthenticationRegion = "us-east-1"
        };
        return new AmazonS3Client(credentials, config);
    }
}
