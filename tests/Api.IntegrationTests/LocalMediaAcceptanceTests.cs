using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using CurateDS.Application.Publications;

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
                ["Storage:Endpoint"] = endpoint,
                ["Storage:AccessKey"] = "curateds-local", ["Storage:SecretKey"] = "curateds-local-development-only",
                ["Storage:BucketName"] = bucket, ["Storage:EnablePublicReadPolicy"] = "false",
                ["Storage:EnforcePrivateReadPolicy"] = "true", ["Publication:Enabled"] = "true"
            })));

        using var publicClient = new HttpClient();
        try
        {
            await storage.PutBucketAsync(bucket);
            await storage.PutBucketPolicyAsync(new PutBucketPolicyRequest { BucketName = bucket, Policy = $$"""
                {"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::{{bucket}}/*"}]}
                """ });
            await storage.PutObjectAsync(new PutObjectRequest { BucketName = bucket, Key = "old-public.png", InputStream = new MemoryStream([1, 2, 3, 4]), ContentType = "image/png", UseChunkEncoding = false, DisableDefaultChecksumValidation = true });
            var oldUrl = $"{endpoint}/{bucket}/old-public.png";
            (await publicClient.GetAsync(oldUrl)).StatusCode.Should().Be(HttpStatusCode.OK);
            using var client = configured.CreateClient(); // Explicit private-policy rollout removes the existing grant.
            (await publicClient.GetAsync(oldUrl)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
            var collection = await Read(await client.PostAsJsonAsync("/collections", new { name = "Local media acceptance" }));
            var collectionId = collection["id"]!.GetValue<string>();
            var item = await Read(await client.PostAsJsonAsync($"/collections/{collectionId}/items", new { name = "Local image test", quantity = 1 }));
            var path = $"/collections/{collectionId}/items/{item["id"]!.GetValue<string>()}";
            using var sourceBitmap = new SkiaSharp.SKBitmap(1, 1);
            sourceBitmap.Erase(SkiaSharp.SKColors.Coral);
            using var sourceImage = SkiaSharp.SKImage.FromBitmap(sourceBitmap);
            using var sourcePng = sourceImage.Encode(SkiaSharp.SKEncodedImageFormat.Png, 100);
            var png = sourcePng.ToArray();
            var assets = new List<JsonObject>();
            foreach (var fileName in new[] { "front.png", "back.png" })
            {
                using var form = new MultipartFormDataContent();
                var file = new ByteArrayContent(png);
                file.Headers.ContentType = new("image/png");
                form.Add(file, "file", fileName);
                var media = await Read(await client.PostAsync($"{path}/media", form));
                assets.Add(media);
                                var contentPath = media["url"]!.GetValue<string>();
                contentPath.Should().StartWith(path + "/media/").And.EndWith("/content");
                (await client.GetByteArrayAsync(contentPath)).Should().Equal(png);
                using var anonymous = new HttpRequestMessage(HttpMethod.Get, contentPath);
                anonymous.Headers.Add("X-Test-Anonymous", "true");
                (await client.SendAsync(anonymous)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
                var objectsNow = await storage.ListObjectsV2Async(new ListObjectsV2Request { BucketName = bucket });
                foreach (var stored in objectsNow.S3Objects)
                    (await publicClient.GetAsync($"{endpoint}/{bucket}/{stored.Key}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
            }
            (await client.PutAsync($"{path}/media/{assets[1]["id"]!.GetValue<string>()}/primary", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
            (await client.PutAsJsonAsync(path, new { name = "Local image test revised", quantity = 2 })).EnsureSuccessStatusCode();
            var updated = await Read(await client.GetAsync(path));
            updated["mediaAssets"]!.AsArray().Should().HaveCount(2);
            updated["mediaAssets"]!.AsArray().Single(asset => asset!["isPrimary"]!.GetValue<bool>())!["id"]!.GetValue<string>()
                .Should().Be(assets[1]["id"]!.GetValue<string>());
            var listing = await Read(await client.GetAsync($"/collections/{collectionId}/items?page=1&pageSize=12"));
            listing["items"]![0]!["primaryImageUrl"]!.GetValue<string>().Should().Be(assets[1]["url"]!.GetValue<string>());
            var publication = $"/collections/{collectionId}/publication";
            var prepared = await client.PostAsJsonAsync(publication + "/previews", new PreparePublication("local-media-showcase"));
            prepared.StatusCode.Should().Be(HttpStatusCode.OK, await prepared.Content.ReadAsStringAsync());
            var preview = (await prepared.Content.ReadFromJsonAsync<PublicationPreview>())!;
            var image = preview.Showcase.Recent!.Single().ImageToken!.Value;
            var publicImage = $"/showcases/local-media-showcase/media/{preview.Token}/{image}";
            (await client.GetAsync(publicImage)).StatusCode.Should().Be(HttpStatusCode.NotFound);
            (await client.GetAsync($"{publication}/previews/{preview.Token}/media/{image}")).EnsureSuccessStatusCode();
            (await client.PutAsJsonAsync(publication, new PublishPublication(preview.Token, preview.Generation))).EnsureSuccessStatusCode();
            using var visitor = new HttpRequestMessage(HttpMethod.Get, publicImage);
            visitor.Headers.Add("X-Test-Anonymous", "true");
            var derivative = await client.SendAsync(visitor); derivative.EnsureSuccessStatusCode();
            derivative.Headers.CacheControl!.NoStore.Should().BeTrue();
            derivative.Content.Headers.ContentType!.MediaType.Should().Be("image/jpeg");
            using (var decoded = SkiaSharp.SKBitmap.Decode(await derivative.Content.ReadAsByteArrayAsync())) decoded.Width.Should().Be(1);
            var storedDerivatives = (await storage.ListObjectsV2Async(new ListObjectsV2Request { BucketName = bucket })).S3Objects
                .Where(o => o.Key.Contains("/showcases/")).ToArray();
            storedDerivatives.Should().ContainSingle();
            (await publicClient.GetAsync($"{endpoint}/{bucket}/{storedDerivatives[0].Key}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
            foreach (var media in assets)
            {
                (await client.DeleteAsync($"{path}/media/{media["id"]!.GetValue<string>()}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
                (await client.GetAsync(media["url"]!.GetValue<string>())).StatusCode.Should().Be(HttpStatusCode.NotFound);
            }
            (await client.GetAsync(publicImage)).StatusCode.Should().Be(HttpStatusCode.NotFound);
            (await client.GetAsync("/showcases/local-media-showcase")).StatusCode.Should().Be(HttpStatusCode.NotFound);
            (await client.PutAsJsonAsync(publication, new PublishPublication(preview.Token, preview.Generation))).StatusCode.Should().Be(HttpStatusCode.Conflict);
            // Retired derivatives remain private until durable cleanup runs; catalog originals are removed immediately.
            (await storage.ListObjectsV2Async(new ListObjectsV2Request { BucketName = bucket })).S3Objects
                .Where(o => !o.Key.Contains("/showcases/")).Should().ContainSingle().Which.Key.Should().Be("old-public.png");
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
