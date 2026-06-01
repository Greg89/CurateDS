using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionEndpointsTests : IClassFixture<CollectionApiFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly CollectionApiFactory _factory;
    private readonly HttpClient _client;

    public CollectionEndpointsTests(CollectionApiFactory factory)
    {
        _factory = factory;
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

        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        var items = paged?.Items;

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
        problem.Extensions["code"]?.ToString().Should().Be("duplicate_tag");
    }

    [Fact]
    public async Task PostLocations_ShouldReturnValidationProblem_WithDuplicateLocationCode_WhenDuplicateNameIsSubmitted()
    {
        var locationName = UniqueName("Office");

        var firstResponse = await _client.PostAsJsonAsync("/locations", new { name = locationName, description = "First" });
        var duplicateResponse = await _client.PostAsJsonAsync("/locations", new { name = locationName, description = "Second" });

        firstResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var problem = await duplicateResponse.Content.ReadFromJsonAsync<ValidationProblemDetails>(JsonOptions);

        problem.Should().NotBeNull();
        problem!.Errors.Should().ContainKey("Name");
        problem.Errors["Name"].Should().Contain("A location with this name already exists.");
        problem.Extensions.Should().ContainKey("code");
        problem.Extensions["code"]?.ToString().Should().Be("duplicate_location");
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

        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        var items = paged?.Items;

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

        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        var items = paged?.Items;

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

        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        var items = paged?.Items;

        items.Should().NotBeNull();
        items!.Select(item => item.Name).Should().ContainInOrder("Animal Crossing", "Zelda");
    }

    [Fact]
    public async Task GetItems_ShouldSortByNameDescending()
    {
        var collection = await CreateCollectionAsync(UniqueName("SortNameDesc"));
        await CreateItemAsync(collection.Id, "Zelda");
        await CreateItemAsync(collection.Id, "Animal Crossing");

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?sortBy=name&sortDirection=desc");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        result!.Items.Select(i => i.Name).Should().ContainInOrder("Zelda", "Animal Crossing");
    }

    [Fact]
    public async Task GetItems_ShouldSortByQuantityAscending()
    {
        var collection = await CreateCollectionAsync(UniqueName("SortQty"));
        await CreateItemWithQuantityAsync(collection.Id, "High", 10);
        await CreateItemWithQuantityAsync(collection.Id, "Low", 1);

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?sortBy=quantity&sortDirection=asc");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        result!.Items.Select(i => i.Name).Should().ContainInOrder("Low", "High");
    }

    [Fact]
    public async Task GetItems_ShouldSortByQuantityDescending()
    {
        var collection = await CreateCollectionAsync(UniqueName("SortQtyDesc"));
        await CreateItemWithQuantityAsync(collection.Id, "High", 10);
        await CreateItemWithQuantityAsync(collection.Id, "Low", 1);

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?sortBy=quantity&sortDirection=desc");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        result!.Items.Select(i => i.Name).Should().ContainInOrder("High", "Low");
    }

    [Fact]
    public async Task GetItems_ShouldSortByCreatedUtcDescending()
    {
        var collection = await CreateCollectionAsync(UniqueName("SortCreated"));
        await CreateItemAsync(collection.Id, "First");
        await CreateItemAsync(collection.Id, "Second");

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?sortBy=createdutc&sortDirection=desc");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        result!.Items.Select(i => i.Name).Should().ContainInOrder("Second", "First");
    }

    [Fact]
    public async Task GetItems_ShouldSortByCreatedUtcAscending()
    {
        var collection = await CreateCollectionAsync(UniqueName("SortCreatedAsc"));
        await CreateItemAsync(collection.Id, "First");
        await CreateItemAsync(collection.Id, "Second");

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?sortBy=createdutc&sortDirection=asc");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        result!.Items.Select(i => i.Name).Should().ContainInOrder("First", "Second");
    }

    [Fact]
    public async Task GetItems_ShouldDefaultSortByUpdatedAscending()
    {
        var collection = await CreateCollectionAsync(UniqueName("SortDefault"));
        await CreateItemAsync(collection.Id, "Alpha");
        await CreateItemAsync(collection.Id, "Beta");

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?sortDirection=asc");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        // asc default: earliest-updated first
        result!.Items.Select(i => i.Name).Should().ContainInOrder("Alpha", "Beta");
    }

    [Fact]
    public async Task GetItems_ShouldReturnPrimaryImageUrl_PrefixedWithPublicBaseUrlAndBucket()
    {
        // Storage:PublicBaseUrl and Storage:BucketName are configured by CollectionApiFactory
        // to known test values so URL composition is fully deterministic.
        var collection = await CreateCollectionAsync(UniqueName("PrimaryImage"));
        var item = await CreateItemAsync(collection.Id, "Item-With-Image");

        const string storageKey = "test-env/collections/abc/items/def/image.jpg";
        const string expectedUrl = "https://cdn.test.example/test-bucket/test-env/collections/abc/items/def/image.jpg";

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            var entity = await dbContext.Items.FindAsync(item.Id);
            entity.Should().NotBeNull();

            var asset = MediaAsset.Create(
                entity!.Id,
                entity.CollectionId,
                storageKey,
                "image/jpeg",
                "image.jpg",
                1024,
                DateTime.UtcNow);
            entity.AddMedia(asset);
            dbContext.MediaAssets.Add(asset);
            await dbContext.SaveChangesAsync();
        }

        var response = await _client.GetAsync($"/collections/{collection.Id}/items");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        var summary = paged!.Items.Single(i => i.Id == item.Id);

        summary.PrimaryImageUrl.Should().Be(expectedUrl);
    }

    [Fact]
    public async Task GetItems_CreatedBeforeFilter_ShouldReturnOnlyMatchingItems()
    {
        var collection = await CreateCollectionAsync(UniqueName("CreatedBefore"));
        await CreateItemAsync(collection.Id, "Existing");

        var yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ssZ");

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?createdBefore={yesterday}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        paged!.Items.Should().BeEmpty();
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
        var paged = await listResponse.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        var items = paged?.Items;

        items!.Should().NotContain(i => i.Id == item.Id);
    }

    [Fact]
    public async Task DeleteItem_ShouldReturn404_WhenItemDoesNotExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("No Item Delete"));

        var response = await _client.DeleteAsync($"/collections/{collection.Id}/items/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteTag_ShouldReturn204_AndHideFromList()
    {
        var tag = await CreateTagAsync(UniqueName("Tag To Delete"));

        var deleteResponse = await _client.DeleteAsync($"/tags/{tag.Id}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResponse = await _client.GetAsync("/tags");
        var tags = await listResponse.Content.ReadFromJsonAsync<IReadOnlyList<TagResponse>>(JsonOptions);

        tags!.Should().NotContain(t => t.Id == tag.Id);
    }

    [Fact]
    public async Task DeleteTag_ShouldReturn404_WhenTagDoesNotExist()
    {
        var response = await _client.DeleteAsync($"/tags/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteLocation_ShouldReturn204_AndHideFromList()
    {
        var location = await CreateLocationAsync(UniqueName("Loc To Delete"), "");

        var deleteResponse = await _client.DeleteAsync($"/locations/{location.Id}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResponse = await _client.GetAsync("/locations");
        var locations = await listResponse.Content.ReadFromJsonAsync<IReadOnlyList<LocationResponse>>(JsonOptions);

        locations!.Should().NotContain(l => l.Id == location.Id);
    }

    [Fact]
    public async Task PostLocation_ShouldReturn422_WhenNameAlreadyExistsForActiveLocation()
    {
        var name = UniqueName("Duplicate Shelf");
        await CreateLocationAsync(name, "");

        var response = await _client.PostAsJsonAsync("/locations", new { name, description = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostLocation_ShouldReturn201_WhenRecreatingPreviouslyDeletedLocationName()
    {
        var name = UniqueName("Recyclable Shelf");
        var original = await CreateLocationAsync(name, "");
        await _client.DeleteAsync($"/locations/{original.Id}");

        var response = await _client.PostAsJsonAsync("/locations", new { name, description = "" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task DeleteLocation_ShouldReturn404_WhenLocationDoesNotExist()
    {
        var response = await _client.DeleteAsync($"/locations/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteAttributeDefinition_ShouldReturn204_AndHideFromList()
    {
        var collection = await CreateCollectionAsync(UniqueName("AttrDef Delete"));
        var attrDef = await CreateAttributeDefinitionAsync(collection.Id, "Year", AttributeDataType.Number, false);

        var deleteResponse = await _client.DeleteAsync(
            $"/collections/{collection.Id}/attribute-definitions/{attrDef.Id}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResponse = await _client.GetAsync($"/collections/{collection.Id}/attribute-definitions");
        var defs = await listResponse.Content.ReadFromJsonAsync<IReadOnlyList<AttributeDefinitionResponse>>(JsonOptions);

        defs!.Should().NotContain(d => d.Id == attrDef.Id);
    }

    [Fact]
    public async Task DeleteAttributeDefinition_ShouldReturn404_WhenDefinitionDoesNotExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("AttrDef No Delete"));

        var response = await _client.DeleteAsync(
            $"/collections/{collection.Id}/attribute-definitions/{Guid.NewGuid()}");

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

    private async Task<ItemSummaryResponse> CreateItemWithQuantityAsync(Guid collectionId, string name, int quantity)
    {
        var response = await _client.PostAsJsonAsync(
            $"/collections/{collectionId}/items",
            new { name, quantity });
        return (await response.Content.ReadFromJsonAsync<ItemSummaryResponse>(JsonOptions))!;
    }

    private async Task<ItemSummaryResponse> CreateItemAtLocationAsync(Guid collectionId, string name, Guid locationId)
    {
        var response = await _client.PostAsJsonAsync(
            $"/collections/{collectionId}/items",
            new { name, quantity = 1, locationId });
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
        Guid? ItemTypeId,
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
        DateTime? UpdatedUtc,
        string? PrimaryImageUrl);

    private sealed record PagedItemsResponse(
        IReadOnlyList<ItemSummaryResponse> Items,
        int TotalCount,
        int Page,
        int PageSize,
        int TotalPages);

    private sealed record ItemDetailResponse(
        Guid Id,
        Guid CollectionId,
        string Name,
        string? Description,
        int Quantity,
        Guid? LocationId,
        string? LocationName,
        Guid? ItemTypeId,
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

    [Fact]
    public async Task GetCollectionSummary_ShouldReturnZeroCounts_ForEmptyCollection()
    {
        var collection = await CreateCollectionAsync(UniqueName("Summary Empty"));

        var response = await _client.GetAsync($"/collections/{collection.Id}/summary");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var summary = await response.Content.ReadFromJsonAsync<CollectionSummaryResponse>(JsonOptions);

        summary.Should().NotBeNull();
        summary!.CollectionId.Should().Be(collection.Id);
        summary.TotalItems.Should().Be(0);
        summary.TotalAttributeDefinitions.Should().Be(0);
        summary.TagsUsed.Should().Be(0);
        summary.LocationsUsed.Should().Be(0);
        summary.ItemsWithNoLocation.Should().Be(0);
        summary.ItemsWithNoTags.Should().Be(0);
        summary.TotalMediaAssets.Should().Be(0);
    }

    [Fact]
    public async Task GetCollectionSummary_ShouldReflectCreatedItems()
    {
        var collection = await CreateCollectionAsync(UniqueName("Summary With Items"));
        var tag = await CreateTagAsync(UniqueName("SumTag"));
        var location = await CreateLocationAsync(UniqueName("SumLoc"), "");

        // Item with a tag and location
        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new { name = "Tagged + Located", quantity = 1, locationId = location.Id, tagIds = new[] { tag.Id } });

        // Item with no tag and no location
        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new { name = "Bare Item", quantity = 1 });

        var response = await _client.GetAsync($"/collections/{collection.Id}/summary");
        var summary = await response.Content.ReadFromJsonAsync<CollectionSummaryResponse>(JsonOptions);

        summary!.TotalItems.Should().Be(2);
        summary.TagsUsed.Should().Be(1);
        summary.LocationsUsed.Should().Be(1);
        summary.ItemsWithNoLocation.Should().Be(1);
        summary.ItemsWithNoTags.Should().Be(1);
    }

    [Fact]
    public async Task GetCollectionSummary_ShouldReturn404_WhenCollectionDoesNotExist()
    {
        var response = await _client.GetAsync($"/collections/{Guid.NewGuid()}/summary");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetCollectionReports_ShouldReturnEmptyBreakdowns_ForEmptyCollection()
    {
        var collection = await CreateCollectionAsync(UniqueName("Reports Empty"));

        var response = await _client.GetAsync($"/collections/{collection.Id}/reports");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var reports = await response.Content.ReadFromJsonAsync<CollectionReportsResponse>(JsonOptions);

        reports.Should().NotBeNull();
        reports!.ItemsByLocation.Should().BeEmpty();
        reports.ItemsByTag.Should().BeEmpty();
    }

    [Fact]
    public async Task GetCollectionReports_ShouldReturnBreakdowns_WhenItemsExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("Reports With Data"));
        var tag = await CreateTagAsync(UniqueName("ReportTag"));
        var location = await CreateLocationAsync(UniqueName("ReportLoc"), "");

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new { name = "Item A", quantity = 1, locationId = location.Id, tagIds = new[] { tag.Id } });

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new { name = "Item B", quantity = 1, tagIds = new[] { tag.Id } });

        var response = await _client.GetAsync($"/collections/{collection.Id}/reports");
        var reports = await response.Content.ReadFromJsonAsync<CollectionReportsResponse>(JsonOptions);

        reports!.ItemsByTag.Should().ContainSingle(x => x.TagId == tag.Id && x.Count == 2);
        reports.ItemsByLocation.Should().Contain(x => x.LocationId == location.Id && x.Count == 1);
        reports.ItemsByLocation.Should().Contain(x => x.LocationId == null && x.Count == 1);
    }

    [Fact]
    public async Task GetCollectionReports_ShouldReturn404_WhenCollectionDoesNotExist()
    {
        var response = await _client.GetAsync($"/collections/{Guid.NewGuid()}/reports");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetCollectionActivity_ShouldReturnEvents_AfterItemCreated()
    {
        var collection = await CreateCollectionAsync(UniqueName("Activity"));
        await CreateItemAsync(collection.Id, "Activity Item");

        var response = await _client.GetAsync($"/collections/{collection.Id}/activity?page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var activity = await response.Content.ReadFromJsonAsync<PagedCollectionActivityResponse>(JsonOptions);

        activity.Should().NotBeNull();
        activity!.TotalCount.Should().BeGreaterThan(0);
        activity.Events.Should().Contain(e => e.ItemName == "Activity Item" && e.EventType == "Created");
    }

    [Fact]
    public async Task GetCollectionActivity_ShouldReturn404_WhenCollectionDoesNotExist()
    {
        var response = await _client.GetAsync($"/collections/{Guid.NewGuid()}/activity?page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetItemEvents_ShouldReturnCreatedEvent_AfterItemCreated()
    {
        var collection = await CreateCollectionAsync(UniqueName("Events"));
        var item = await CreateItemAsync(collection.Id, "Event Item");

        var response = await _client.GetAsync($"/collections/{collection.Id}/items/{item.Id}/events");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var events = await response.Content.ReadFromJsonAsync<ItemEventResponse[]>(JsonOptions);

        events.Should().NotBeNull();
        events!.Should().ContainSingle(e => e.EventType == "Created" && e.ItemId == item.Id);
    }

    [Fact]
    public async Task GetItemEvents_ShouldReturn404_WhenItemDoesNotExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("Events404"));

        var response = await _client.GetAsync($"/collections/{collection.Id}/items/{Guid.NewGuid()}/events");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListSavedViews_ShouldReturnEmpty_WhenNoneExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("SV Empty"));

        var response = await _client.GetAsync($"/collections/{collection.Id}/saved-views");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var views = await response.Content.ReadFromJsonAsync<SavedViewResponse[]>(JsonOptions);
        views.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateSavedView_ShouldPersistAndReturn201()
    {
        var collection = await CreateCollectionAsync(UniqueName("SV Create"));
        var filtersJson = """{"searchText":"test","tagIds":[]}""";

        var response = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/saved-views",
            new { name = "My View", filtersJson });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var view = await response.Content.ReadFromJsonAsync<SavedViewResponse>(JsonOptions);
        view!.Name.Should().Be("My View");
        view.FiltersJson.Should().Be(filtersJson);
        view.CollectionId.Should().Be(collection.Id);
    }

    [Fact]
    public async Task CreateThenListSavedViews_ShouldReturnCreatedView()
    {
        var collection = await CreateCollectionAsync(UniqueName("SV List"));

        await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/saved-views",
            new { name = "View A", filtersJson = "{}" });

        var response = await _client.GetAsync($"/collections/{collection.Id}/saved-views");
        var views = await response.Content.ReadFromJsonAsync<SavedViewResponse[]>(JsonOptions);

        views.Should().ContainSingle(v => v.Name == "View A");
    }

    [Fact]
    public async Task DeleteSavedView_ShouldReturn204_AndRemoveView()
    {
        var collection = await CreateCollectionAsync(UniqueName("SV Delete"));

        var createResponse = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/saved-views",
            new { name = "Temp View", filtersJson = "{}" });

        var created = await createResponse.Content.ReadFromJsonAsync<SavedViewResponse>(JsonOptions);

        var deleteResponse = await _client.DeleteAsync(
            $"/collections/{collection.Id}/saved-views/{created!.Id}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResponse = await _client.GetAsync($"/collections/{collection.Id}/saved-views");
        var views = await listResponse.Content.ReadFromJsonAsync<SavedViewResponse[]>(JsonOptions);
        views.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteSavedView_ShouldReturn404_WhenViewDoesNotExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("SV Delete 404"));

        var response = await _client.DeleteAsync(
            $"/collections/{collection.Id}/saved-views/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateSavedView_ShouldReturn404_WhenCollectionDoesNotExist()
    {
        var response = await _client.PostAsJsonAsync(
            $"/collections/{Guid.NewGuid()}/saved-views",
            new { name = "View", filtersJson = "{}" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ExportCollection_ShouldReturnZip_WithItemsCsv()
    {
        var collection = await CreateCollectionAsync(UniqueName("Export"));
        await CreateItemAsync(collection.Id, "Export Item A");
        await CreateItemAsync(collection.Id, "Export Item B");

        var response = await _client.GetAsync($"/collections/{collection.Id}/export");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/zip");

        var bytes = await response.Content.ReadAsByteArrayAsync();
        bytes.Length.Should().BeGreaterThan(0);

        using var zip = new System.IO.Compression.ZipArchive(new System.IO.MemoryStream(bytes));
        zip.Entries.Should().Contain(e => e.Name == "items.csv");
        zip.Entries.Should().Contain(e => e.Name == "attribute_definitions.csv");

        var itemsEntry = zip.Entries.First(e => e.Name == "items.csv");
        using var reader = new System.IO.StreamReader(itemsEntry.Open());
        var csvContent = reader.ReadToEnd();
        csvContent.Should().Contain("Export Item A");
        csvContent.Should().Contain("Export Item B");
    }

    [Fact]
    public async Task ExportCollection_ShouldReturn404_WhenCollectionDoesNotExist()
    {
        var response = await _client.GetAsync($"/collections/{Guid.NewGuid()}/export");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetItems_QuantityRangeFilter_ShouldReturnOnlyMatchingItems()
    {
        var collection = await CreateCollectionAsync(UniqueName("QtyRange"));
        await CreateItemWithQuantityAsync(collection.Id, "Five", 5);
        await CreateItemWithQuantityAsync(collection.Id, "Ten", 10);
        await CreateItemWithQuantityAsync(collection.Id, "Twenty", 20);

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?minQuantity=8&maxQuantity=15");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        paged!.Items.Should().ContainSingle(i => i.Name == "Ten");
        paged.Items.Should().NotContain(i => i.Name == "Five");
        paged.Items.Should().NotContain(i => i.Name == "Twenty");
    }

    [Fact]
    public async Task GetItems_DateRangeFilter_ShouldReturnOnlyMatchingItems()
    {
        var collection = await CreateCollectionAsync(UniqueName("DateRange"));
        await CreateItemAsync(collection.Id, "Before");

        // We rely on the fact that items created after a future date are excluded
        var tomorrow = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?createdAfter={tomorrow}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        paged!.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GetItems_HasNoLocationFilter_ShouldReturnOnlyUnassignedItems()
    {
        var collection = await CreateCollectionAsync(UniqueName("NoLocation"));
        var location = await CreateLocationAsync(UniqueName("Shelf"), "A shelf");
        await CreateItemAsync(collection.Id, "Unassigned");
        await CreateItemAtLocationAsync(collection.Id, "Assigned", location.Id);

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?hasNoLocation=true");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        paged!.Items.Should().ContainSingle(i => i.Name == "Unassigned");
        paged.Items.Should().NotContain(i => i.Name == "Assigned");
    }

    [Fact]
    public async Task GetItems_HasNoTagsFilter_ShouldReturnOnlyUntaggedItems()
    {
        var collection = await CreateCollectionAsync(UniqueName("NoTags"));
        var tag = await CreateTagAsync(UniqueName("Rare"));

        await CreateItemAsync(collection.Id, "Untagged");
        var tagged = await CreateItemAsync(collection.Id, "Tagged");
        await _client.PutAsJsonAsync(
            $"/collections/{collection.Id}/items/{tagged.Id}",
            new { name = "Tagged", quantity = 1, tagIds = new[] { tag.Id } });

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?hasNoTags=true");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        paged!.Items.Should().ContainSingle(i => i.Name == "Untagged");
        paged.Items.Should().NotContain(i => i.Name == "Tagged");
    }

    private sealed record SavedViewResponse(Guid Id, Guid CollectionId, string Name, string FiltersJson, DateTime CreatedUtc);

    private sealed record CollectionReportsResponse(
        IReadOnlyList<ItemsByLocationResponse> ItemsByLocation,
        IReadOnlyList<ItemsByTagResponse> ItemsByTag);

    private sealed record ItemsByLocationResponse(Guid? LocationId, string LocationName, int Count);

    private sealed record ItemsByTagResponse(Guid TagId, string TagName, int Count);

    private sealed record PagedCollectionActivityResponse(
        IReadOnlyList<CollectionActivityEventResponse> Events,
        int TotalCount,
        int Page,
        int PageSize,
        int TotalPages);

    private sealed record CollectionActivityEventResponse(
        Guid EventId,
        Guid ItemId,
        string ItemName,
        string EventType,
        DateTime OccurredUtc,
        string OccurredBy,
        string? Notes);

    private sealed record CollectionSummaryResponse(
        Guid CollectionId,
        int TotalItems,
        int TotalAttributeDefinitions,
        int TagsUsed,
        int LocationsUsed,
        int ItemsWithNoLocation,
        int ItemsWithNoTags,
        int TotalMediaAssets);

    private sealed record TagResponse(Guid Id, string Name, string Key, DateTime CreatedUtc);

    private sealed record LocationResponse(Guid Id, string Name, string? Description, DateTime CreatedUtc);

    private sealed record ItemTypeResponse(Guid Id, Guid CollectionId, string Name, int SortOrder, DateTime CreatedUtc);

    private sealed record ItemEventResponse(Guid Id, Guid ItemId, Guid CollectionId, string EventType, DateTime OccurredUtc, string OccurredBy, string? Notes);

    [Fact]
    public async Task DeleteItemMedia_ShouldReturn404_WhenItemDoesNotExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("Media404"));

        var response = await _client.DeleteAsync(
            $"/collections/{collection.Id}/items/{Guid.NewGuid()}/media/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SetPrimaryItemMedia_ShouldReturn404_WhenItemDoesNotExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("Primary404"));

        var response = await _client.PutAsync(
            $"/collections/{collection.Id}/items/{Guid.NewGuid()}/media/{Guid.NewGuid()}/primary",
            new StringContent(string.Empty));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UploadItemMedia_ShouldReturn404_WhenItemDoesNotExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("Upload404"));
        using var content = new MultipartFormDataContent();
        using var fileContent = new ByteArrayContent([0xFF, 0xD8, 0xFF]);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "photo.jpg");

        var response = await _client.PostAsync(
            $"/collections/{collection.Id}/items/{Guid.NewGuid()}/media",
            content);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostItemTypes_ShouldCreateItemType()
    {
        var collection = await CreateCollectionAsync(UniqueName("ItemTypes"));

        var response = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/item-types",
            new { name = "Machine" });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await response.Content.ReadFromJsonAsync<ItemTypeResponse>(JsonOptions);
        created.Should().NotBeNull();
        created!.Name.Should().Be("Machine");
        created.CollectionId.Should().Be(collection.Id);
        created.SortOrder.Should().Be(0);
    }

    [Fact]
    public async Task GetItemTypes_ShouldReturnCreatedItemTypes()
    {
        var collection = await CreateCollectionAsync(UniqueName("ItemTypesGet"));

        await _client.PostAsJsonAsync($"/collections/{collection.Id}/item-types", new { name = "Machine" });
        await _client.PostAsJsonAsync($"/collections/{collection.Id}/item-types", new { name = "Part" });

        var response = await _client.GetAsync($"/collections/{collection.Id}/item-types");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var itemTypes = await response.Content.ReadFromJsonAsync<IReadOnlyList<ItemTypeResponse>>(JsonOptions);
        itemTypes.Should().NotBeNull();
        itemTypes!.Should().HaveCount(2);
        itemTypes.Select(it => it.Name).Should().Contain(["Machine", "Part"]);
        itemTypes.Select(it => it.SortOrder).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task DeleteItemType_ShouldReturnNoContent()
    {
        var collection = await CreateCollectionAsync(UniqueName("ItemTypesDel"));

        var createResponse = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/item-types",
            new { name = "Machine" });
        var created = await createResponse.Content.ReadFromJsonAsync<ItemTypeResponse>(JsonOptions);

        var deleteResponse = await _client.DeleteAsync(
            $"/collections/{collection.Id}/item-types/{created!.Id}");

        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResponse = await _client.GetAsync($"/collections/{collection.Id}/item-types");
        var itemTypes = await listResponse.Content.ReadFromJsonAsync<IReadOnlyList<ItemTypeResponse>>(JsonOptions);
        itemTypes!.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteItemType_ShouldReturnNotFound_WhenItemTypeDoesNotExist()
    {
        var collection = await CreateCollectionAsync(UniqueName("ItemTypesNF"));

        var response = await _client.DeleteAsync(
            $"/collections/{collection.Id}/item-types/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostItems_ShouldCreateItem_WithItemTypeAssigned()
    {
        var collection = await CreateCollectionAsync(UniqueName("ItemWithType"));
        var createTypeResponse = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/item-types", new { name = "Machine" });
        var itemType = await createTypeResponse.Content.ReadFromJsonAsync<ItemTypeResponse>(JsonOptions);

        var response = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/items",
            new { name = "Singer 66", quantity = 1, itemTypeId = itemType!.Id });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await response.Content.ReadFromJsonAsync<ItemDetailResponse>(JsonOptions);
        created!.ItemTypeId.Should().Be(itemType.Id);
    }

    [Fact]
    public async Task PostItemTypes_ShouldReturnBadRequest_WhenNameIsTooShort()
    {
        var collection = await CreateCollectionAsync(UniqueName("ItemTypesValidation"));

        var response = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/item-types",
            new { name = "X" }); // 1 character — below the 2-character minimum

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetItems_ShouldFilterByItemType()
    {
        var collection = await CreateCollectionAsync(UniqueName("ItemTypeFilter"));

        var typeAResponse = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/item-types", new { name = "Type A" });
        var typeA = await typeAResponse.Content.ReadFromJsonAsync<ItemTypeResponse>(JsonOptions);

        var typeBResponse = await _client.PostAsJsonAsync(
            $"/collections/{collection.Id}/item-types", new { name = "Type B" });
        var typeB = await typeBResponse.Content.ReadFromJsonAsync<ItemTypeResponse>(JsonOptions);

        await _client.PostAsJsonAsync($"/collections/{collection.Id}/items",
            new { name = "Item A1", quantity = 1, itemTypeId = typeA!.Id });
        await _client.PostAsJsonAsync($"/collections/{collection.Id}/items",
            new { name = "Item A2", quantity = 1, itemTypeId = typeA.Id });
        await _client.PostAsJsonAsync($"/collections/{collection.Id}/items",
            new { name = "Item B1", quantity = 1, itemTypeId = typeB!.Id });

        var response = await _client.GetAsync(
            $"/collections/{collection.Id}/items?itemTypeId={typeA.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PagedItemsResponse>(JsonOptions);
        result!.Items.Should().HaveCount(2);
        result.Items.Select(i => i.Name).Should().BeEquivalentTo(["Item A1", "Item A2"]);
    }

}
