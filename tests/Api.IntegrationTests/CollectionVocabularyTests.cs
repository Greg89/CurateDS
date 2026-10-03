using System.Net;
using System.Net.Http.Json;
using CurateDS.Api.Collections;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionVocabularyTests(CollectionApiFactory factory) : IClassFixture<CollectionApiFactory>
{
    [Fact]
    public async Task Vocabulary_ShouldPersistAndSurviveIndependentIdentityChanges()
    {
        using var client = factory.CreateClient();
        var collection = (await (await client.PostAsJsonAsync("/collections", new { name = "Reading room", color = "clay" }))
            .Content.ReadFromJsonAsync<CollectionResponse>())!;
        collection.ItemLabel.Should().Be("item"); collection.ItemsLabel.Should().Be("items");
        var path = $"/collections/{collection.Id}";
        var updated = (await (await client.PutAsJsonAsync(path + "/vocabulary", new { itemLabel = " book ", itemsLabel = " books " }))
            .Content.ReadFromJsonAsync<CollectionResponse>())!;
        updated.ItemLabel.Should().Be("book"); updated.ItemsLabel.Should().Be("books"); updated.Color.Should().Be("clay");
        var identity = (await (await client.PutAsJsonAsync(path, new { name = "Renamed reading room", color = "slate" }))
            .Content.ReadFromJsonAsync<CollectionResponse>())!;
        identity.ItemLabel.Should().Be("book");
        (await client.GetFromJsonAsync<CollectionResponse[]>("/collections"))!.Single(c => c.Id == collection.Id).Should().BeEquivalentTo(identity);
        (await client.PutAsJsonAsync(path + "/vocabulary", new { itemLabel = "item", itemsLabel = "items" })).EnsureSuccessStatusCode();
        (await client.GetFromJsonAsync<CollectionResponse[]>("/collections"))!.Single(c => c.Id == collection.Id).ItemLabel.Should().Be("item");
    }

    [Theory]
    [InlineData(null, "books")]
    [InlineData("", "books")]
    [InlineData("book", "   ")]
    [InlineData("book\n", "books")]
    [InlineData("abcdefghijklmnopqrstuvwxyz012345678901234", "books")]
    public async Task InvalidVocabulary_ShouldLeaveBothLabelsUnchanged(string? one, string? many)
    {
        using var client = factory.CreateClient();
        var collection = (await (await client.PostAsJsonAsync("/collections", new { name = "Label validation" }))
            .Content.ReadFromJsonAsync<CollectionResponse>())!;
        (await client.PutAsJsonAsync($"/collections/{collection.Id}/vocabulary", new { itemLabel = one, itemsLabel = many })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetFromJsonAsync<CollectionResponse[]>("/collections"))!.Single(c => c.Id == collection.Id).Should().BeEquivalentTo(collection);
    }

    [Fact]
    public async Task Vocabulary_ShouldHideForeignAndMissingCollections()
    {
        var foreign = Collection.Create("another-owner", "Private words", DateTime.UtcNow, "another-owner");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>(); db.Collections.Add(foreign); await db.SaveChangesAsync();
        }
        using var client = factory.CreateClient();
        foreach (var id in new[] { foreign.Id, Guid.NewGuid() })
            (await client.PutAsJsonAsync($"/collections/{id}/vocabulary", new { itemLabel = "book", itemsLabel = "books" })).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
