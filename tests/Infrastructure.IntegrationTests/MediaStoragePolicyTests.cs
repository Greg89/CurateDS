using Amazon.S3;
using CurateDS.Infrastructure.Storage;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class MediaStoragePolicyTests
{
    [Fact]
    public async Task PrivateEnforcement_ShouldFailWhenStorageIsNotConfigured()
    {
        var initializer = new MediaStorageInitializer(Options.Create(new MediaStorageOptions { EnforcePrivateReadPolicy = true }), NullLogger<MediaStorageInitializer>.Instance);
        Func<Task> start = () => initializer.StartAsync(default);
        await start.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task PrivateEnforcement_ShouldFailIfPolicyRemovalIsDenied()
    {
        var deleted = false;
        await using var server = await FakeS3Server.StartAsync(async (ctx, _) =>
        {
            if (ctx.Request.Method == "DELETE")
            {
                deleted = true; ctx.Response.StatusCode = 403; ctx.Response.ContentType = "application/xml";
                await ctx.Response.Body.WriteAsync(System.Text.Encoding.UTF8.GetBytes("<Error><Code>AccessDenied</Code><Message>Denied</Message></Error>"));
            }
            else ctx.Response.StatusCode = 200;
        });
        var initializer = new MediaStorageInitializer(Options.Create(new MediaStorageOptions {
            Endpoint = server.BaseUrl, AccessKey = "test", SecretKey = "test", BucketName = "test-bucket",
            EnforcePrivateReadPolicy = true, EnablePublicReadPolicy = true,
        }), NullLogger<MediaStorageInitializer>.Instance);
        Func<Task> start = () => initializer.StartAsync(default);
        await start.Should().ThrowAsync<AmazonS3Exception>(); deleted.Should().BeTrue();
    }
}
