using System.Net;
using System.Net.Http.Json;
using CurateDS.Api.Collections;
using CurateDS.Application.Collections.CollectionPresentation;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionPresentationApiTests(CollectionApiFactory factory) : IClassFixture<CollectionApiFactory>
{
    [Fact]
    public async Task Presentation_ShouldPersistOrderAndFlagsWithoutChangingIdentity()
    {
        using var client = factory.CreateClient();
        var collection = (await (await client.PostAsJsonAsync("/collections", new { name = "Pinned library", color = "clay" }))
            .Content.ReadFromJsonAsync<CollectionResponse>())!;
        var first = (await (await client.PostAsJsonAsync($"/collections/{collection.Id}/items", new { name = "First book", quantity = 1 }))
            .Content.ReadFromJsonAsync<ItemDetailResponse>())!;
        var second = (await (await client.PostAsJsonAsync($"/collections/{collection.Id}/items", new { name = "Second book", quantity = 1 }))
            .Content.ReadFromJsonAsync<ItemDetailResponse>())!;
        var path = $"/collections/{collection.Id}/presentation";
        var defaults = (await client.GetFromJsonAsync<CollectionPresentationDto>(path))!;
        defaults.ShowCover.Should().BeTrue(); defaults.ShowRecentItems.Should().BeTrue();
        (await client.PutAsJsonAsync(path, new { showCover = false, showSummary = false, showPinnedItems = true,
            showRecentItems = false, pinnedItemIds = new[] { second.Id, first.Id } })).EnsureSuccessStatusCode();
        var saved = (await client.GetFromJsonAsync<CollectionPresentationDto>(path))!;
        saved.PinnedItems.Select(item => item.Id).Should().Equal(second.Id, first.Id);
        saved.ShowCover.Should().BeFalse(); saved.ShowRecentItems.Should().BeFalse();
        (await client.GetFromJsonAsync<CollectionResponse[]>("/collections")).Should().ContainEquivalentOf(collection);
        (await client.DeleteAsync($"/collections/{collection.Id}/items/{second.Id}")).EnsureSuccessStatusCode();
        (await client.GetFromJsonAsync<CollectionPresentationDto>(path))!.PinnedItems.Should().ContainSingle().Which.Id.Should().Be(first.Id);
    }

    [Theory]
    [InlineData("duplicates")]
    [InlineData("too-many")]
    [InlineData("missing")]
    [InlineData("foreign")]
    [InlineData("null")]
    public async Task InvalidPins_ShouldNotChangeSettings(string kind)
    {
        using var client = factory.CreateClient();
        var collection = (await (await client.PostAsJsonAsync("/collections", new { name = "Protected collection" }))
            .Content.ReadFromJsonAsync<CollectionResponse>())!;
        var foreignCollection = Collection.Create("another-owner", "Private collection", DateTime.UtcNow, "another-owner");
        var foreign = Item.Create(foreignCollection.Id, "Private item", null, 1, DateTime.UtcNow, "another-owner");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            db.Collections.Add(foreignCollection); db.Items.Add(foreign); await db.SaveChangesAsync();
        }
        Guid[]? ids = kind switch {
            "duplicates" => [foreign.Id, foreign.Id],
            "too-many" => Enumerable.Range(0, 7).Select(_ => Guid.NewGuid()).ToArray(),
            "missing" => [Guid.NewGuid()],
            "foreign" => [foreign.Id],
            _ => null
        };
        var body = new { showCover = false, showSummary = false, showPinnedItems = false, showRecentItems = false, pinnedItemIds = ids };
        var path = $"/collections/{collection.Id}/presentation";
        (await client.PutAsJsonAsync(path, body)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetFromJsonAsync<CollectionPresentationDto>(path))!.ShowCover.Should().BeTrue();
        var foreignPath = $"/collections/{foreignCollection.Id}/presentation";
        (await client.GetAsync(foreignPath)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.PutAsJsonAsync(foreignPath, new { showCover = false, showSummary = true,
            showPinnedItems = true, showRecentItems = true, pinnedItemIds = Array.Empty<Guid>() })).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
