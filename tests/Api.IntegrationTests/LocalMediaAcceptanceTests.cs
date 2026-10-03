using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace CurateDS.Api.IntegrationTests;

// Opt-in: uses only the loopback storage from compose.media.yaml and an isolated in-memory API.
public sealed class LocalMediaFactAttribute : FactAttribute
{
    public LocalMediaFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("CURATEDS_TEST_LOCAL_MEDIA") != "1")
            Skip = "Set CURATEDS_TEST_LOCAL_MEDIA=1 after starting compose.media.yaml.";
    }
}

public sealed class LocalMediaAcceptanceTests
{
    [LocalMediaFact]
    public async Task Upload_Primary_Edit_And_Delete_ShouldUseRealLocalStorage()
    {
        var bucket = $"curateds-acceptance-{Guid.NewGuid():N}";
        const string endpoint = "http://127.0.0.1:9000";
        using var storage = new AmazonS3Client(
            new BasicAWSCredentials("curateds-local", "curateds-local-development-only"),
            new AmazonS3Config
            {
                ServiceURL = endpoint, ForcePathStyle = true, AuthenticationRegion = "us-east-1",
                RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED
            });
        using var factory = new CollectionApiFactory();
        using var configured = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Storage:Endpoint"] = endpoint, ["Storage:PublicBaseUrl"] = endpoint,
                ["Storage:AccessKey"] = "curateds-local", ["Storage:SecretKey"] = "curateds-local-development-only",
                ["Storage:BucketName"] = bucket, ["Storage:EnablePublicReadPolicy"] = "true"
            })));
        using var client = configured.CreateClient();
        using var publicClient = new HttpClient();
        try
        {
            var collection = await Read(await client.PostAsJsonAsync("/collections", new { name = "Local media acceptance" }));
            var collectionId = collection["id"]!.GetValue<string>();
            var item = await Read(await client.PostAsJsonAsync($"/collections/{collectionId}/items", new { name = "Local image test", quantity = 1 }));
            var path = $"/collections/{collectionId}/items/{item["id"]!.GetValue<string>()}";
            var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=");
            var assets = new List<JsonObject>();
            foreach (var fileName in new[] { "front.png", "back.png" })
            {
                using var form = new MultipartFormDataContent();
                var file = new ByteArrayContent(png);
                file.Headers.ContentType = new("image/png");
                form.Add(file, "file", fileName);
                var media = await Read(await client.PostAsync($"{path}/media", form));
                assets.Add(media);
                (await publicClient.GetByteArrayAsync(media["url"]!.GetValue<string>())).Should().Equal(png);
            }
            (await client.PutAsync($"{path}/media/{assets[1]["id"]!.GetValue<string>()}/primary", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
            (await client.PutAsJsonAsync(path, new { name = "Local image test revised", quantity = 2 })).EnsureSuccessStatusCode();
            var updated = await Read(await client.GetAsync(path));
            updated["mediaAssets"]!.AsArray().Should().HaveCount(2);
            updated["mediaAssets"]!.AsArray().Single(asset => asset!["isPrimary"]!.GetValue<bool>())!["id"]!.GetValue<string>()
                .Should().Be(assets[1]["id"]!.GetValue<string>());
            var listing = await Read(await client.GetAsync($"/collections/{collectionId}/items?page=1&pageSize=12"));
            listing["items"]![0]!["primaryImageUrl"]!.GetValue<string>().Should().Be(assets[1]["url"]!.GetValue<string>());
            foreach (var media in assets)
            {
                (await client.DeleteAsync($"{path}/media/{media["id"]!.GetValue<string>()}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
                (await publicClient.GetAsync(media["url"]!.GetValue<string>())).StatusCode.Should().Be(HttpStatusCode.NotFound);
            }
            (await client.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
        finally
        {
            // This test owns this uniquely named bucket; user media and the normal development bucket are untouched.
            var objects = await storage.ListObjectsV2Async(new ListObjectsV2Request { BucketName = bucket });
            foreach (var entry in objects.S3Objects ?? [])
                await storage.DeleteObjectAsync(bucket, entry.Key);
            await storage.DeleteBucketAsync(bucket);
        }
    }

    private static async Task<JsonObject> Read(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonObject>())!;
    }
}
