using System.Net;
using CurateDS.Application.Abstractions;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace CurateDS.Api.IntegrationTests;

public sealed class MediaReadTests
{
    [Theory]
    [InlineData("owner", HttpStatusCode.OK, 1)]
    [InlineData("anonymous", HttpStatusCode.Unauthorized, 0)]
    [InlineData("foreign", HttpStatusCode.NotFound, 0)]
    [InlineData("wrong-item", HttpStatusCode.NotFound, 0)]
    [InlineData("deleted-item", HttpStatusCode.NotFound, 0)]
    [InlineData("deleted-collection", HttpStatusCode.NotFound, 0)]
    [InlineData("deleted-media", HttpStatusCode.NotFound, 0)]
    [InlineData("missing-object", HttpStatusCode.NotFound, 1)]
    [InlineData("unsafe-type", HttpStatusCode.BadGateway, 0)]
    [InlineData("length-mismatch", HttpStatusCode.BadGateway, 1)]
    [InlineData("storage-failure", HttpStatusCode.BadGateway, 1)]
    public async Task Read_ShouldRequireOwnershipAndLiveAssociationsAndNeverCache(string scenario, HttpStatusCode status, int reads)
    {
        var storage = new Storage { Missing = scenario == "missing-object", Fail = scenario == "storage-failure" };
        using var factory = new CollectionApiFactory();
        using var configured = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IMediaStorageService>(); services.AddSingleton<IMediaStorageService>(storage);
        }));
        using var client = configured.CreateClient();
        var collection = Collection.Create(scenario == "foreign" ? "another-owner" : "test-user-id", "Private media", DateTime.UtcNow, "owner");
        var item = Item.Create(collection.Id, "Photograph", null, 1, DateTime.UtcNow, "owner");
        var asset = MediaAsset.Create(item.Id, collection.Id, "private-key", scenario == "unsafe-type" ? "image/svg+xml" : "image/png", "photo.png", scenario == "length-mismatch" ? 5 : 4, DateTime.UtcNow);
        item.AddMedia(asset);
        if (scenario == "deleted-item") item.SoftDelete(DateTime.UtcNow, "owner");
        if (scenario == "deleted-collection") collection.SoftDelete(DateTime.UtcNow, "owner");
        using (var scope = configured.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>(); db.Collections.Add(collection); db.Items.Add(item); await db.SaveChangesAsync();
            if (scenario == "deleted-media") { item.RemoveMedia(asset.Id); await db.SaveChangesAsync(); }
        }
        if (scenario == "anonymous") client.DefaultRequestHeaders.Add("X-Test-Anonymous", "true");
        var requestItem = scenario == "wrong-item" ? Guid.NewGuid() : item.Id;
        var response = await client.GetAsync($"/collections/{collection.Id}/items/{requestItem}/media/{asset.Id}/content");
        response.StatusCode.Should().Be(status);
        response.Headers.CacheControl!.NoStore.Should().BeTrue();
        response.Headers.GetValues("X-Content-Type-Options").Should().Contain("nosniff");
        storage.Reads.Should().Be(reads);
        if (status == HttpStatusCode.OK)
        {
            response.Content.Headers.ContentType!.MediaType.Should().Be("image/png");
            (await response.Content.ReadAsByteArrayAsync()).Should().Equal(1, 2, 3, 4);
            storage.Maximum.Should().Be(4);
        }
        else (await response.Content.ReadAsStringAsync()).Should().NotContain("private-key");
    }
    private sealed class Storage : IMediaStorageService
    {
        public int Reads; public long Maximum; public bool Missing; public bool Fail;
        public Task<byte[]?> ReadAsync(string key, long maximumBytes, CancellationToken ct)
        {
            Reads++; Maximum = maximumBytes; key.Should().Be("private-key");
            if (Fail) throw new IOException("Storage failure");
            return Task.FromResult<byte[]?>(Missing ? null : [1, 2, 3, 4]);
        }
        public Task<string> UploadAsync(Guid collectionId, Guid itemId, Stream content, string contentType, string extension, CancellationToken ct) => throw new NotSupportedException();
        public Task DeleteAsync(string key, CancellationToken ct) => throw new NotSupportedException();
    }
}
