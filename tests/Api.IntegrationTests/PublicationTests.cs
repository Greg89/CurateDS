using System.Net;
using System.Net.Http.Json;
using CurateDS.Application.Publications;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using CurateDS.Infrastructure.Storage;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace CurateDS.Api.IntegrationTests;

public sealed class PublicationTests
{
    private static WebApplicationFactory<Program> Configured(CollectionApiFactory factory) => factory.WithWebHostBuilder(builder =>
    {
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        { ["Publication:Enabled"] = "true", ["Storage:EnforcePrivateReadPolicy"] = "true", ["Publication:PreviewsPerMinute"] = "60" }));
        builder.ConfigureServices(services =>
        {
            foreach (var entry in services.Where(s => s.ImplementationType == typeof(MediaStorageInitializer)).ToArray()) services.Remove(entry);
        });
    });
    private static async Task<(Collection Collection, Item Item)> Seed(WebApplicationFactory<Program> factory, string owner = "test-user-id", bool sections = true)
    {
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        var collection = Collection.Create(owner, "Reading room", DateTime.UtcNow, "PRIVATE_ACTOR", "Books", "Reviewed introduction", "https://private.example/cover.jpg");
        collection.UpdateShowcaseSettings("journal", sections, sections, DateTime.UtcNow, owner);
        var item = Item.Create(collection.Id, "Featured book", new string('x', 1100), 42, DateTime.UtcNow, "PRIVATE_ACTOR");
        collection.UpdatePresentation(true, sections, sections, sections, [item.Id], DateTime.UtcNow, owner);
        db.Collections.Add(collection); db.Items.Add(item); await db.SaveChangesAsync(); return (collection, item);
    }
    private static async Task<PublicationPreview> Prepare(HttpClient client, Guid collection, string slug = "reading-room")
    {
        var response = await client.PostAsJsonAsync($"/collections/{collection}/publication/previews", new PreparePublication(slug, true));
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<PublicationPreview>())!;
    }
    private static Task<HttpResponseMessage> Publish(HttpClient client, Guid collection, PublicationPreview preview) =>
        client.PutAsJsonAsync($"/collections/{collection}/publication", new PublishPublication(preview.Token, preview.Generation));

    [Fact]
    public async Task ReviewPublishReplaceAndUnpublish_KeepEditionFrozenAndRevokeOldTokens()
    {
        using var factory = new CollectionApiFactory(); using var configured = Configured(factory); using var client = configured.CreateClient();
        var (collection, item) = await Seed(configured); var path = $"/collections/{collection.Id}/publication";
        var first = await Prepare(client, collection.Id);
        first.Showcase.Highlights!.Single().Description!.Length.Should().Be(1000);
        first.Showcase.Highlights!.Single().DescriptionTruncated.Should().BeTrue();
        first.Showcase.Recent.Should().BeEmpty(); first.Showcase.Growth.Should().HaveCount(12);
        (await client.GetAsync("/showcases/reading-room")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await Publish(client, collection.Id, first)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await Publish(client, collection.Id, first)).StatusCode.Should().Be(HttpStatusCode.OK);
        var response = await client.GetAsync("/showcases/reading-room"); response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        foreach (var forbidden in new[] { collection.Id.ToString(), item.Id.ToString(), "test-user-id", "PRIVATE_ACTOR", "private.example", "quantity", "storageKey", "ownerId" })
            json.Should().NotContain(forbidden);
        response.Headers.CacheControl!.NoStore.Should().BeTrue(); response.Headers.Should().NotContainKey("Set-Cookie");
        using (var scope = configured.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            var saved = await db.Collections.FindAsync(collection.Id);
            saved!.UpdateIdentity("Changed live title", null, null, null, "clay", DateTime.UtcNow, "owner"); await db.SaveChangesAsync();
        }
        (await client.GetStringAsync("/showcases/reading-room")).Should().Contain("Reading room").And.NotContain("Changed live title");
        var next = await Prepare(client, collection.Id); (await Publish(client, collection.Id, next)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.GetAsync($"/showcases/reading-room/revisions/{first.Token}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await Publish(client, collection.Id, first)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        var pending = await Prepare(client, collection.Id);
        (await client.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await Publish(client, collection.Id, pending)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        var gone = await client.SendAsync(new HttpRequestMessage(HttpMethod.Head, "/showcases/reading-room"));
        gone.StatusCode.Should().Be(HttpStatusCode.NotFound); gone.Headers.CacheControl!.NoStore.Should().BeTrue();
        (await client.GetAsync($"{path}/previews/{pending.Token}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var status = await client.GetFromJsonAsync<PublicationStatus>(path); status!.Slug.Should().Be("reading-room");
    }

    [Theory]
    [InlineData("item")] [InlineData("collection")] [InlineData("type")]
    public async Task SourceRemoval_SuspendsPublicationAndInvalidatesReview(string source)
    {
        using var factory = new CollectionApiFactory(); using var configured = Configured(factory); using var client = configured.CreateClient();
        var (collection, item) = await Seed(configured);
        Guid typeId = Guid.Empty;
        if (source == "type")
        {
            var result = await client.PostAsJsonAsync($"/collections/{collection.Id}/item-types", new { name = "Books" });
            result.EnsureSuccessStatusCode(); var payload = await result.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            typeId = payload.GetProperty("id").GetGuid();
        }
        var first = await Prepare(client, collection.Id); (await Publish(client, collection.Id, first)).EnsureSuccessStatusCode();
        var pending = await Prepare(client, collection.Id);
        var path = source == "collection" ? $"/collections/{collection.Id}" : source == "item"
            ? $"/collections/{collection.Id}/items/{item.Id}" : $"/collections/{collection.Id}/item-types/{typeId}";
        (await client.DeleteAsync(path)).EnsureSuccessStatusCode();
        (await client.GetAsync("/showcases/reading-room")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await Publish(client, collection.Id, pending)).StatusCode.Should().Be(source == "collection" ? HttpStatusCode.NotFound : HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task OwnerBoundariesAndOmittedSections_DoNotLeakPrivateData()
    {
        using var factory = new CollectionApiFactory(); using var configured = Configured(factory); using var client = configured.CreateClient();
        var (collection, _) = await Seed(configured, sections: false); var (foreign, _) = await Seed(configured, "foreign");
        var review = await Prepare(client, collection.Id);
        (await client.GetAsync($"/collections/{foreign.Id}/publication")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.GetAsync($"/collections/{foreign.Id}/publication/previews/{review.Token}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.PutAsJsonAsync($"/collections/{collection.Id}/publication", new PublishPublication(Guid.NewGuid(), 0))).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await Publish(client, collection.Id, review)).EnsureSuccessStatusCode();
        client.DefaultRequestHeaders.Add("X-Test-Anonymous", "true");
        (await client.GetAsync($"/collections/{collection.Id}/publication")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var response = await client.GetAsync("/showcases/reading-room"); response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        foreach (var field in new[] { "summary", "highlights", "recent", "growth", "types", "Featured book" }) json.Should().NotContain(field);
        client.DefaultRequestHeaders.Authorization = new("Bearer", "invalid-signed-in-visitor-token");
        (await client.GetStringAsync("/showcases/reading-room")).Should().Be(json);
    }

    [Fact]
    public async Task PublicReads_NeverContactIdentityProviderEvenWithBearerHeader()
    {
        var discovery = new UnavailableDiscovery();
        using var factory = new CollectionApiFactory(); using var enabled = Configured(factory);
        using var configured = enabled.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.PostConfigure<AuthenticationOptions>(options => options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme);
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options => options.ConfigurationManager = discovery);
        }));
        using var client = configured.CreateClient(); var (collection, _) = await Seed(configured, sections: false);
        using (var scope = configured.Services.CreateScope())
        {
            var service = scope.ServiceProvider.GetRequiredService<IPublicationService>();
            var preview = await service.PrepareAsync("test-user-id", collection.Id, new("reading-room", true), default);
            await service.PublishAsync("test-user-id", collection.Id, new(preview.Token, preview.Generation), default);
        }
        client.DefaultRequestHeaders.Authorization = new("Bearer", "invalid-token");
        var response = await client.GetAsync("/showcases/reading-room"); response.EnsureSuccessStatusCode();
        response.Headers.Should().NotContainKey("Set-Cookie"); discovery.Requests.Should().Be(0);
        (await client.GetAsync("/collections")).IsSuccessStatusCode.Should().BeFalse();
        discovery.Requests.Should().BeGreaterThan(0);
    }
    private sealed class UnavailableDiscovery : IConfigurationManager<OpenIdConnectConfiguration>
    {
        public int Requests;
        public Task<OpenIdConnectConfiguration> GetConfigurationAsync(CancellationToken cancel)
        { Requests++; throw new IOException("Identity provider unavailable"); }
        public void RequestRefresh() { Requests++; }
    }
    [Fact]
    public async Task FeatureIsDisabledByDefault()
    {
        using var factory = new CollectionApiFactory(); using var client = factory.CreateClient();
        (await client.GetAsync("/showcases/reading-room")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.GetAsync($"/collections/{Guid.NewGuid()}/publication")).StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
    }
}
