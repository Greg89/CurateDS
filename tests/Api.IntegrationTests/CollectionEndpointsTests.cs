using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
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

    [Fact]
    public async Task PutItem_ShouldUpdateItemAndAttributeValues()
    {
        var collection = await CreateCollectionAsync("Video Games");
        var platform = await CreateAttributeDefinitionAsync(collection.Id, "Platform", AttributeDataType.Text, true);
        var completed = await CreateAttributeDefinitionAsync(collection.Id, "Completed", AttributeDataType.Boolean, false);

        var createResponse = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Chrono Trigger",
                description = "Super Famicom copy",
                quantity = 1,
                attributeValues = new[]
                {
                    new
                    {
                        attributeDefinitionId = platform.Id,
                        value = "SNES"
                    }
                }
            });

        var createdItem = await createResponse.Content.ReadFromJsonAsync<ItemDetailResponse>(JsonOptions);

        var response = await _client.PutAsJsonAsync(
            $"/collections/{collection.Id}/items/{createdItem!.Id}",
            new
            {
                name = "Chrono Trigger DS",
                description = "Updated release",
                quantity = 2,
                attributeValues = new[]
                {
                    new
                    {
                        attributeDefinitionId = platform.Id,
                        value = "Nintendo DS"
                    },
                    new
                    {
                        attributeDefinitionId = completed.Id,
                        value = "true"
                    }
                }
            });

        var responseBody = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK, responseBody);

        var updated = await response.Content.ReadFromJsonAsync<ItemDetailResponse>(JsonOptions);

        updated.Should().NotBeNull();
        updated!.Name.Should().Be("Chrono Trigger DS");
        updated.Quantity.Should().Be(2);
        updated.AttributeValues.Should().Contain(value => value.AttributeName == "Completed" && value.Value == "True");
    }

    [Fact]
    public async Task PostTagsAndLocations_ShouldCreateOrganizationRecords()
    {
        var tagName = UniqueName("Backlog");
        var locationName = UniqueName("Hall Closet");

        var tagResponse = await _client.PostAsJsonAsync("/tags", new { name = tagName });
        var locationResponse = await _client.PostAsJsonAsync("/locations", new
        {
            name = locationName,
            description = "Top shelf bin"
        });

        tagResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        locationResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var tags = await (await _client.GetAsync("/tags")).Content.ReadFromJsonAsync<IReadOnlyList<TagResponse>>(JsonOptions);
        var locations = await (await _client.GetAsync("/locations")).Content.ReadFromJsonAsync<IReadOnlyList<LocationResponse>>(JsonOptions);

        tags.Should().Contain(tag => tag.Name == tagName);
        locations.Should().Contain(location => location.Name == locationName);
    }

    [Fact]
    public async Task PostTags_ShouldReturnConflict_WhenDuplicateNameIsSubmitted()
    {
        var tagName = UniqueName("Wishlist");

        var firstResponse = await _client.PostAsJsonAsync("/tags", new { name = tagName });
        var duplicateResponse = await _client.PostAsJsonAsync("/tags", new { name = $" {tagName} " });

        firstResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var problem = await duplicateResponse.Content.ReadFromJsonAsync<ValidationProblemDetails>(JsonOptions);

        problem.Should().NotBeNull();
        problem!.Type.Should().Be("urn:curateds:problem:validation");
        problem.Title.Should().Be("Validation failed");
        problem.Status.Should().Be((int)HttpStatusCode.BadRequest);
        problem.Errors.Should().ContainKey("Name");
        problem.Errors["Name"].Should().Contain("A tag with this name already exists.");
        problem.Extensions.Should().ContainKey("code");
        problem.Extensions["code"]?.ToString().Should().Be("validation_error");
    }

    [Fact]
    public async Task GetItemDetail_ShouldReturnStructuredProblemDetails_WhenItemDoesNotExist()
    {
        var collection = await CreateCollectionAsync("Magazines");

        var response = await _client.GetAsync($"/collections/{collection.Id}/items/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);

        problem.Should().NotBeNull();
        problem!.Type.Should().Be("urn:curateds:problem:not-found");
        problem.Title.Should().Be("Resource not found");
        problem.Status.Should().Be((int)HttpStatusCode.NotFound);
        problem.Detail.Should().Be("Item was not found.");
        problem.Extensions.Should().ContainKey("code");
        problem.Extensions["code"]?.ToString().Should().Be("resource_not_found");
    }

    [Fact]
    public async Task PostItems_ShouldPersistLocationAndTags()
    {
        var collection = await CreateCollectionAsync("Board Games");
        var playerCount = await CreateAttributeDefinitionAsync(collection.Id, "Players", AttributeDataType.Number, false);
        var tag = await CreateTagAsync(UniqueName("Favorite"));
        var location = await CreateLocationAsync(UniqueName("Game Cabinet"), "Living room");

        var response = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Spirit Island",
                description = "Jagged Earth included",
                quantity = 1,
                locationId = location.Id,
                tagIds = new[] { tag.Id },
                attributeValues = new[]
                {
                    new
                    {
                        attributeDefinitionId = playerCount.Id,
                        value = "4"
                    }
                }
            });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await response.Content.ReadFromJsonAsync<ItemDetailResponse>(JsonOptions);

        created.Should().NotBeNull();
        created!.LocationName.Should().Be(location.Name);
        created.Tags.Should().ContainSingle(savedTag => savedTag.Name == tag.Name);
    }

    [Fact]
    public async Task GetItems_ShouldFilterBySearchTextTagAndLocation()
    {
        var collection = await CreateCollectionAsync("Books");
        var tag = await CreateTagAsync(UniqueName("Wishlist"));
        var location = await CreateLocationAsync(UniqueName("Office Shelf"), "Top row");
        var author = await CreateAttributeDefinitionAsync(collection.Id, "Author", AttributeDataType.Text, false);

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Dune",
                description = "Hardcover edition",
                quantity = 1,
                locationId = location.Id,
                tagIds = new[] { tag.Id },
                attributeValues = new[]
                {
                    new
                    {
                        attributeDefinitionId = author.Id,
                        value = "Frank Herbert"
                    }
                }
            });

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Foundation",
                description = "Paperback",
                quantity = 1,
                attributeValues = Array.Empty<object>()
            });

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?searchText=Herbert&locationId={location.Id}&tagIds={tag.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var items = await response.Content.ReadFromJsonAsync<IReadOnlyList<ItemSummaryResponse>>(JsonOptions);

        items.Should().ContainSingle();
        items![0].Name.Should().Be("Dune");
    }

    [Fact]
    public async Task GetItems_ShouldFilterByCustomAttributeValue()
    {
        var collection = await CreateCollectionAsync("Movies");
        var director = await CreateAttributeDefinitionAsync(collection.Id, "Director", AttributeDataType.Text, false);

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Arrival",
                description = "Steelbook",
                quantity = 1,
                attributeValues = new[]
                {
                    new
                    {
                        attributeDefinitionId = director.Id,
                        value = "Denis Villeneuve"
                    }
                }
            });

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Interstellar",
                description = "Blu-ray",
                quantity = 1,
                attributeValues = new[]
                {
                    new
                    {
                        attributeDefinitionId = director.Id,
                        value = "Christopher Nolan"
                    }
                }
            });

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?attributeFilters={director.Key}=Villeneuve");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var items = await response.Content.ReadFromJsonAsync<IReadOnlyList<ItemSummaryResponse>>(JsonOptions);

        items.Should().ContainSingle();
        items![0].Name.Should().Be("Arrival");
    }

    [Fact]
    public async Task GetItems_ShouldSortByNameAscending()
    {
        var collection = await CreateCollectionAsync("Games");

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Zelda",
                description = "Adventure",
                quantity = 1,
                attributeValues = Array.Empty<object>()
            });

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new
            {
                name = "Animal Crossing",
                description = "Cozy",
                quantity = 1,
                attributeValues = Array.Empty<object>()
            });

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?sortBy=name&sortDirection=asc");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var items = await response.Content.ReadFromJsonAsync<IReadOnlyList<ItemSummaryResponse>>(JsonOptions);

        items.Should().NotBeNull();
        items!.Select(item => item.Name).Should().ContainInOrder("Animal Crossing", "Zelda");
    }

    [Fact]
    public async Task DeleteCollection_ShouldReturn204_AndHideFromList()
    {
        var collection = await CreateCollectionAsync(UniqueName("Delete Me"));

        var deleteResponse = await _client.DeleteAsync($"/collections/{collection.Id}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResponse = await _client.GetAsync("/collections");
        var collections = await listResponse.Content.ReadFromJsonAsync<IReadOnlyList<CollectionResponse>>(JsonOptions);

        collections!.Should().NotContain(c => c.Id == collection.Id);
    }

    [Fact]
    public async Task DeleteCollection_ShouldReturn404_WhenCollectionDoesNotExist()
    {
        var response = await _client.DeleteAsync($"/collections/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteItem_ShouldReturn204_AndHideFromList()
    {
        var collection = await CreateCollectionAsync(UniqueName("Item Delete"));
        var item = await CreateItemAsync(collection.Id, "Item To Delete");

        var deleteResponse = await _client.DeleteAsync($"/collections/{collection.Id}/items/{item.Id}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResponse = await _client.GetAsync($"/collections/{collection.Id}/items");
        var items = await listResponse.Content.ReadFromJsonAsync<IReadOnlyList<ItemSummaryResponse>>(JsonOptions);

        items!.Should().NotContain(i => i.Id == item.Id);
    }

    [Fact]
    public async Task DeleteItem_ShouldReturn404_WhenItemDoesNotExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("No Item Delete"));

        var response = await _client.DeleteAsync($"/collections/{collection.Id}/items/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private async Task<CollectionResponse> CreateCollectionAsync(string name)
    {
        var response = await _client.PostAsJsonAsync("/collections", new { name });
        var collection = await response.Content.ReadFromJsonAsync<CollectionResponse>(JsonOptions);
        return collection!;
    }

    private async Task<ItemSummaryResponse> CreateItemAsync(Guid collectionId, string name)
    {
        var response = await _client.PostAsJsonAsync(
            $"/collections/{collectionId}/items",
            new { name, quantity = 1 });
        return (await response.Content.ReadFromJsonAsync<ItemSummaryResponse>(JsonOptions))!;
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

    private async Task<TagResponse> CreateTagAsync(string name)
    {
        var response = await _client.PostAsJsonAsync("/tags", new { name });
        return (await response.Content.ReadFromJsonAsync<TagResponse>(JsonOptions))!;
    }

    private async Task<LocationResponse> CreateLocationAsync(string name, string description)
    {
        var response = await _client.PostAsJsonAsync("/locations", new { name, description });
        return (await response.Content.ReadFromJsonAsync<LocationResponse>(JsonOptions))!;
    }

    private static string UniqueName(string prefix) => $"{prefix} {Guid.NewGuid():N}".Substring(0, prefix.Length + 9);

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
        Guid? LocationId,
        string? LocationName,
        IReadOnlyList<string> Tags,
        int AttributeValueCount,
        DateTime CreatedUtc,
        DateTime? UpdatedUtc);

    private sealed record ItemDetailResponse(
        Guid Id,
        Guid CollectionId,
        string Name,
        string? Description,
        int Quantity,
        Guid? LocationId,
        string? LocationName,
        IReadOnlyList<TagResponse> Tags,
        DateTime CreatedUtc,
        DateTime? UpdatedUtc,
        IReadOnlyList<ItemAttributeValueResponse> AttributeValues);

    private sealed record ItemAttributeValueResponse(
        Guid AttributeDefinitionId,
        string AttributeName,
        string AttributeKey,
        AttributeDataType DataType,
        string Value);

    private sealed record TagResponse(Guid Id, string Name, string Key, DateTime CreatedUtc);

    private sealed record LocationResponse(Guid Id, string Name, string? Description, DateTime CreatedUtc);

}
