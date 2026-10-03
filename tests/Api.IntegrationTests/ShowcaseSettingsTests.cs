using System.Net;
using System.Net.Http.Json;
using CurateDS.Api.Collections;
using CurateDS.Application.Collections.ShowcaseSettings;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace CurateDS.Api.IntegrationTests;

public sealed class ShowcaseSettingsTests(CollectionApiFactory factory) : IClassFixture<CollectionApiFactory>
{
    [Fact]
    public async Task Settings_ShouldPersistIndependentlyAndRestoreDefaults()
    {
        using var client = factory.CreateClient();
        var collection = (await (await client.PostAsJsonAsync("/collections", new { name = "Showcase stories", color = "clay" })).Content.ReadFromJsonAsync<CollectionResponse>())!;
        var path = $"/collections/{collection.Id}";
        (await client.GetFromJsonAsync<ShowcaseSettingsDto>(path + "/showcase-settings"))!.Should().Be(new ShowcaseSettingsDto(collection.Id, "gallery", false, false));
        (await client.PutAsJsonAsync(path + "/showcase-settings", new { layout = "journal", showGrowth = true, showTypes = true })).EnsureSuccessStatusCode();
        (await client.PutAsJsonAsync(path + "/presentation", new { showCover = false, showSummary = false, showPinnedItems = false, showRecentItems = false, pinnedItemIds = Array.Empty<Guid>() })).EnsureSuccessStatusCode();
        (await client.PutAsJsonAsync(path, new { name = "Updated stories", color = "slate" })).EnsureSuccessStatusCode();
        (await client.GetFromJsonAsync<ShowcaseSettingsDto>(path + "/showcase-settings"))!.Should().Be(new ShowcaseSettingsDto(collection.Id, "journal", true, true));
        (await client.PutAsJsonAsync(path + "/showcase-settings", new { layout = "gallery", showGrowth = false, showTypes = false })).EnsureSuccessStatusCode();
        (await client.GetFromJsonAsync<ShowcaseSettingsDto>(path + "/showcase-settings"))!.Layout.Should().Be("gallery");
        var presentation = await client.GetFromJsonAsync<CurateDS.Application.Collections.CollectionPresentation.CollectionPresentationDto>(path + "/presentation");
        presentation!.ShowCover.Should().BeFalse();
    }

    [Theory]
    [InlineData("{\"layout\":\"unknown\",\"showGrowth\":true,\"showTypes\":true}")]
    [InlineData("{\"layout\":null,\"showGrowth\":true,\"showTypes\":true}")]
    [InlineData("{\"layout\":\"journal\",\"showGrowth\":true}")]
    [InlineData("{\"layout\":\"journal\",\"showTypes\":true}")]
    public async Task InvalidSettings_ShouldNotChangeAnySettings(string json)
    {
        using var client = factory.CreateClient();
        var collection = (await (await client.PostAsJsonAsync("/collections", new { name = "Showcase validation" })).Content.ReadFromJsonAsync<CollectionResponse>())!;
        var path = $"/collections/{collection.Id}/showcase-settings";
        (await client.PutAsync(path, new StringContent(json, System.Text.Encoding.UTF8, "application/json"))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetFromJsonAsync<ShowcaseSettingsDto>(path))!.Should().Be(new ShowcaseSettingsDto(collection.Id, "gallery", false, false));
    }

    [Fact]
    public async Task Settings_ShouldHideForeignAndMissingCollections()
    {
        var foreign = Collection.Create("another-owner", "Private showcase", DateTime.UtcNow, "another-owner");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>(); db.Collections.Add(foreign); await db.SaveChangesAsync();
        }
        using var client = factory.CreateClient();
        foreach (var id in new[] { foreign.Id, Guid.NewGuid() })
        {
            var path = $"/collections/{id}/showcase-settings";
            (await client.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.NotFound);
            (await client.PutAsJsonAsync(path, new { layout = "journal", showGrowth = true, showTypes = true })).StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
