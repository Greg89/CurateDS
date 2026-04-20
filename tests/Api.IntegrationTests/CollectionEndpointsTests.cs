using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionEndpointsTests : IClassFixture<CollectionApiFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

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

        var created = await response.Content.ReadFromJsonAsync<CollectionResponse>(JsonOptions);

        created.Should().NotBeNull();
        created!.Name.Should().Be("Board Games");
    }

    [Fact]
    public async Task GetCollections_ShouldReturnCreatedCollections()
    {
        await _client.PostAsJsonAsync("/collections", new { name = "Fountain Pens" });

        var response = await _client.GetAsync("/collections");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var collections = await response.Content.ReadFromJsonAsync<IReadOnlyList<CollectionResponse>>(JsonOptions);

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
        var collection = await collectionResponse.Content.ReadFromJsonAsync<CollectionResponse>(JsonOptions);

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

        var created = await response.Content.ReadFromJsonAsync<AttributeDefinitionResponse>(JsonOptions);

        created.Should().NotBeNull();
        created!.Name.Should().Be("Release Year");
        created.Key.Should().Be("release-year");
    }

    [Fact]
    public async Task PostAttributeDefinitions_ShouldAcceptStringEnumValues()
    {
        var collectionResponse = await _client.PostAsJsonAsync("/collections", new { name = "Books" });
        var collection = await collectionResponse.Content.ReadFromJsonAsync<CollectionResponse>(JsonOptions);

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
        var collection = await collectionResponse.Content.ReadFromJsonAsync<CollectionResponse>(JsonOptions);

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

        var definitions = await response.Content.ReadFromJsonAsync<IReadOnlyList<AttributeDefinitionResponse>>(JsonOptions);

        definitions.Should().NotBeNull();
        definitions!.Should().Contain(definition => definition.Name == "Painted");
    }

    [Fact]
    public async Task PostItems_ShouldCreateItemWithAttributeValues()
    {
        var collection = await CreateCollectionAsync("Comics");
        var issueNumber = await CreateAttributeDefinitionAsync(collection.Id, "Issue Number", AttributeDataType.Number, true);

        var response = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Amazing Spider-Man",
                description = "Signed copy",
                quantity = 1,
                attributeValues = new[]
                {
                    new
                    {
                        attributeDefinitionId = issueNumber.Id,
                        value = "300"
                    }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await response.Content.ReadFromJsonAsync<ItemDetailResponse>(JsonOptions);

        created.Should().NotBeNull();
        created!.Name.Should().Be("Amazing Spider-Man");
        created.AttributeValues.Should().ContainSingle(value => value.Value == "300");
    }

    [Fact]
    public async Task PostItems_ShouldReturnBadRequest_WhenRequiredAttributeValueIsMissing()
    {
        var collection = await CreateCollectionAsync("Books");
        await CreateAttributeDefinitionAsync(collection.Id, "Author", AttributeDataType.Text, true);

        var response = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "The Hobbit",
                description = "Hardcover",
                quantity = 1,
                attributeValues = Array.Empty<object>()
            });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetItems_ShouldReturnCreatedItems()
    {
        var collection = await CreateCollectionAsync("Board Games");
        var publisher = await CreateAttributeDefinitionAsync(collection.Id, "Publisher", AttributeDataType.Text, false);

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Root",
                description = "Woodland war game",
                quantity = 1,
                attributeValues = new[]
                {
                    new
                    {
                        attributeDefinitionId = publisher.Id,
                        value = "Leder Games"
                    }
                }
            });

        var response = await _client.GetAsync($"/collections/{collection.Id}/items");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var items = await response.Content.ReadFromJsonAsync<IReadOnlyList<ItemSummaryResponse>>(JsonOptions);

        items.Should().NotBeNull();
        items!.Should().Contain(item => item.Name == "Root");
    }

    [Fact]
    public async Task GetItemDetail_ShouldReturnCreatedItem()
    {
        var collection = await CreateCollectionAsync("Records");
        var releaseYear = await CreateAttributeDefinitionAsync(collection.Id, "Release Year", AttributeDataType.Number, true);

        var createItemResponse = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Kind of Blue",
                description = "Mono pressing",
                quantity = 1,
                attributeValues = new[]
                {
                    new
                    {
                        attributeDefinitionId = releaseYear.Id,
                        value = "1959"
                    }
                }
            });

        var createdItem = await createItemResponse.Content.ReadFromJsonAsync<ItemDetailResponse>(JsonOptions);

        var response = await _client.GetAsync($"/collections/{collection.Id}/items/{createdItem!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var item = await response.Content.ReadFromJsonAsync<ItemDetailResponse>(JsonOptions);

        item.Should().NotBeNull();
        item!.AttributeValues.Should().ContainSingle(value => value.AttributeName == "Release Year" && value.Value == "1959");
    }

    private async Task<CollectionResponse> CreateCollectionAsync(string name)
    {
        var response = await _client.PostAsJsonAsync("/collections", new { name });
        var collection = await response.Content.ReadFromJsonAsync<CollectionResponse>(JsonOptions);
        return collection!;
    }

    private async Task<AttributeDefinitionResponse> CreateAttributeDefinitionAsync(
        Guid collectionId,
        string name,
        AttributeDataType dataType,
        bool isRequired)
    {
        var response = await _client.PostAsJsonAsync(
            $"/collections/{collectionId}/attribute-definitions",
            new
            {
                name,
                dataType,
                isRequired,
                isFilterable = true
            });

        var attributeDefinition = await response.Content.ReadFromJsonAsync<AttributeDefinitionResponse>(JsonOptions);
        return attributeDefinition!;
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

    private sealed record ItemSummaryResponse(
        Guid Id,
        Guid CollectionId,
        string Name,
        string? Description,
        int Quantity,
        int AttributeValueCount,
        DateTime CreatedUtc,
        DateTime UpdatedUtc);

    private sealed record ItemDetailResponse(
        Guid Id,
        Guid CollectionId,
        string Name,
        string? Description,
        int Quantity,
        DateTime CreatedUtc,
        DateTime UpdatedUtc,
        IReadOnlyList<ItemAttributeValueResponse> AttributeValues);

    private sealed record ItemAttributeValueResponse(
        Guid AttributeDefinitionId,
        string AttributeName,
        string AttributeKey,
        AttributeDataType DataType,
        string Value);
}
