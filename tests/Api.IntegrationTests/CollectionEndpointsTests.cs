using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionEndpointsTests : IClassFixture<CollectionApiFactory>
{
    private readonly HttpClient _client;

    public CollectionEndpointsTests(CollectionApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostCollections_ShouldCreateCollection()
    {
        var response = await _client.PostAsJsonAsync("/collections", new { name = "Board Games" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await response.Content.ReadFromJsonAsync<CollectionResponse>();

        created.Should().NotBeNull();
        created!.Name.Should().Be("Board Games");
    }

    [Fact]
    public async Task GetCollections_ShouldReturnCreatedCollections()
    {
        await _client.PostAsJsonAsync("/collections", new { name = "Fountain Pens" });

        var response = await _client.GetAsync("/collections");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var collections = await response.Content.ReadFromJsonAsync<IReadOnlyList<CollectionResponse>>();

        collections.Should().NotBeNull();
        collections!.Should().Contain(collection => collection.Name == "Fountain Pens");
    }

    private sealed record CollectionResponse(Guid Id, string Name, DateTime CreatedUtc);
}
