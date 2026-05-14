using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CurateDS.Infrastructure.Storage;

/// <summary>
/// Runs once at startup to ensure the media storage bucket exists and has the
/// correct access policy. Provisioning is intentionally separated from upload
/// so that UploadAsync does not pay S3 control-plane overhead on every request.
/// </summary>
public sealed class MediaStorageInitializer : IHostedService
{
    private readonly MediaStorageOptions _options;
    private readonly ILogger<MediaStorageInitializer> _logger;

    public MediaStorageInitializer(
        IOptions<MediaStorageOptions> options,
        ILogger<MediaStorageInitializer> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.Endpoint) ||
            string.IsNullOrWhiteSpace(_options.BucketName) ||
            string.IsNullOrWhiteSpace(_options.AccessKey) ||
            string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            _logger.LogDebug("Media storage options are not configured — skipping bucket initialisation.");
            return;
        }

        try
        {
            var credentials = new BasicAWSCredentials(_options.AccessKey, _options.SecretKey);
            var config = new AmazonS3Config
            {
                ServiceURL = _options.Endpoint,
                ForcePathStyle = true,
                AuthenticationRegion = "us-east-1"
            };

            using var client = new AmazonS3Client(credentials, config);

            try
            {
                await client.PutBucketAsync(_options.BucketName, cancellationToken);
                _logger.LogInformation("Media storage bucket '{Bucket}' created.", _options.BucketName);
            }
            catch (AmazonS3Exception ex) when (ex.ErrorCode is "BucketAlreadyOwnedByYou")
            {
                // Already exists and we own it — that's fine
            }
            catch (AmazonS3Exception ex) when (ex.ErrorCode is "BucketAlreadyExists")
            {
                _logger.LogWarning(ex,
                    "Media storage bucket '{Bucket}' already exists and is owned by another account. Check your storage configuration.",
                    _options.BucketName);
                return;
            }

            var policy = $$"""
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": { "AWS": ["*"] },
                      "Action": ["s3:GetObject"],
                      "Resource": ["arn:aws:s3:::{{_options.BucketName}}/*"]
                    }
                  ]
                }
                """;

            if (_options.EnablePublicReadPolicy)
            {
                await client.PutBucketPolicyAsync(new PutBucketPolicyRequest
                {
                    BucketName = _options.BucketName,
                    Policy = policy
                }, cancellationToken);

                _logger.LogInformation("Media storage bucket '{Bucket}' policy configured.", _options.BucketName);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Media storage initialisation failed. Uploads may fail until storage is configured and bucket '{Bucket}' exists.",
                _options.BucketName);
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
