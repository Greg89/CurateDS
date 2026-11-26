using System.Net.Http.Json;
using System.Text.Json;
using CurateDS.Api.Collections;
using FluentAssertions;

namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionOpenApiTests : IClassFixture<CollectionApiFactory>
{
    private readonly HttpClient _client;
    public CollectionOpenApiTests(CollectionApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task CollectionList_ShouldPublishTheResponseContractUsedByWebV2()
    {
        using var response = await _client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var schema = document.RootElement.GetProperty("paths").GetProperty("/collections")
            .GetProperty("get").GetProperty("responses").GetProperty("200")
            .GetProperty("content").GetProperty("application/json").GetProperty("schema");
        schema.GetProperty("type").GetString().Should().Be("array");
        schema.GetProperty("items").GetProperty("$ref").GetString()
            .Should().Be("#/components/schemas/CollectionResponse");
        var properties = document.RootElement.GetProperty("components").GetProperty("schemas")
            .GetProperty("CollectionResponse").GetProperty("properties");
        properties.GetProperty("id").GetProperty("format").GetString().Should().Be("uuid");
        properties.GetProperty("name").GetProperty("type").GetString().Should().Be("string");
        properties.GetProperty("createdUtc").GetProperty("format").GetString().Should().Be("date-time");

        using var created = await _client.PostAsJsonAsync("/collections", new { name = "V2 Contract Collection" });
        created.EnsureSuccessStatusCode();
        var collection = await created.Content.ReadFromJsonAsync<CollectionResponse>();
        var collections = await _client.GetFromJsonAsync<CollectionResponse[]>("/collections");
        collections.Should().Contain(entry => entry.Id == collection!.Id && entry.Name == collection.Name);
    }
}
