using System.Net;
using System.Net.Http.Json;
using CurateDS.Domain.Collections;
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

    [Fact]
    public async Task PostCollections_ShouldReturnBadRequest_WhenNameIsWhitespaceOnly()
    {
        var response = await _client.PostAsJsonAsync("/collections", new { name = "   " });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostAttributeDefinitions_ShouldCreateAttributeDefinition()
    {
        var collectionResponse = await _client.PostAsJsonAsync("/collections", new { name = "Records" });
        var collection = await collectionResponse.Content.ReadFromJsonAsync<CollectionResponse>();

        var response = await _client.PostAsJsonAsync(
            $"/collections/{collection!.Id}/attribute-definitions",
            new
            {
                name = "Release Year",
                dataType = AttributeDataType.Number,
                isRequired = false,
                isFilterable = true
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await response.Content.ReadFromJsonAsync<AttributeDefinitionResponse>();

        created.Should().NotBeNull();
        created!.Name.Should().Be("Release Year");
        created.Key.Should().Be("release-year");
    }

    [Fact]
    public async Task PostAttributeDefinitions_ShouldAcceptStringEnumValues()
    {
        var collectionResponse = await _client.PostAsJsonAsync("/collections", new { name = "Books" });
        var collection = await collectionResponse.Content.ReadFromJsonAsync<CollectionResponse>();

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/collections/{collection!.Id}/attribute-definitions")
        {
            Content = JsonContent.Create(new
            {
                name = "Signed",
                dataType = "Boolean",
                isRequired = false,
                isFilterable = true
            })
        };

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task GetAttributeDefinitions_ShouldReturnCollectionDefinitions()
    {
        var collectionResponse = await _client.PostAsJsonAsync("/collections", new { name = "Miniatures" });
        var collection = await collectionResponse.Content.ReadFromJsonAsync<CollectionResponse>();

        await _client.PostAsJsonAsync(
            $"/collections/{collection!.Id}/attribute-definitions",
            new
            {
                name = "Painted",
                dataType = AttributeDataType.Boolean,
                isRequired = false,
                isFilterable = true
            });

        var response = await _client.GetAsync($"/collections/{collection.Id}/attribute-definitions");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var definitions = await response.Content.ReadFromJsonAsync<IReadOnlyList<AttributeDefinitionResponse>>();

        definitions.Should().NotBeNull();
        definitions!.Should().Contain(definition => definition.Name == "Painted");
    }

    private sealed record CollectionResponse(Guid Id, string Name, DateTime CreatedUtc);

    private sealed record AttributeDefinitionResponse(
        Guid Id,
        Guid CollectionId,
        string Name,
        string Key,
        AttributeDataType DataType,
        bool IsRequired,
        bool IsFilterable,
        int SortOrder,
        DateTime CreatedUtc);
}
