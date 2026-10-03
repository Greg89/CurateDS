using System.Net;
using System.Net.Http.Json;
using CurateDS.Api.Collections;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionIdentityTests(CollectionApiFactory factory) : IClassFixture<CollectionApiFactory>
{
    [Fact]
    public async Task CreateAndList_ShouldPersistIdentityAndStartWithAnEmptySummary()
    {
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/collections", new {
            name = "  Weekend shelves  ", category = "  Books  ", description = "  Stories worth keeping.  ",
            coverImageUrl = "https://images.example/cover.jpg", color = "clay"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = (await response.Content.ReadFromJsonAsync<CollectionResponse>())!;
        created.Name.Should().Be("Weekend shelves");
        created.Category.Should().Be("Books");
        created.Description.Should().Be("Stories worth keeping.");
        created.Color.Should().Be("clay");
        var listed = await client.GetFromJsonAsync<CollectionResponse[]>("/collections");
        listed.Should().ContainEquivalentOf(created);
        var summary = await client.GetFromJsonAsync<CollectionSummaryResponse>($"/collections/{created.Id}/summary");
        summary!.TotalItems.Should().Be(0);
        var item = await client.PostAsJsonAsync($"/collections/{created.Id}/items", new {
            name = "A first edition", description = "Found on Sunday", quantity = 1,
            tagIds = Array.Empty<Guid>(), attributeValues = Array.Empty<object>()
        });
        item.StatusCode.Should().Be(HttpStatusCode.Created);
        summary = await client.GetFromJsonAsync<CollectionSummaryResponse>($"/collections/{created.Id}/summary");
        summary!.TotalItems.Should().Be(1);
        var recent = await client.GetFromJsonAsync<PagedItemsResponse>($"/collections/{created.Id}/items?page=1&pageSize=6&sortBy=createdUtc&sortDirection=desc");
        recent!.Items.Should().ContainSingle().Which.Name.Should().Be("A first edition");
    }

    [Theory]
    [InlineData("javascript:alert(1)", "forest")]
    [InlineData("http://images.example/cover.jpg", "forest")]
    [InlineData("https://user:password@images.example/cover.jpg", "forest")]
    [InlineData("https://images.example/cover.jpg", "unrecognized")]
    public async Task Create_ShouldRejectInvalidIdentity(string coverImageUrl, string color)
    {
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/collections", new { name = "Invalid identity", coverImageUrl, color });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task IdentityAndOverview_ShouldRemainPrivateToTheOwner()
    {
        var foreign = Collection.Create("another-user", "Private archive", DateTime.UtcNow, "another-user", "Books", "Private description");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            db.Collections.Add(foreign);
            await db.SaveChangesAsync();
        }
        using var client = factory.CreateClient();
        (await client.GetFromJsonAsync<CollectionResponse[]>("/collections"))!.Should().NotContain(c => c.Id == foreign.Id);
        (await client.GetAsync($"/collections/{foreign.Id}/summary")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.GetAsync($"/collections/{foreign.Id}/items")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.PostAsJsonAsync($"/collections/{foreign.Id}/items", new { name = "Unauthorized item", quantity = 1 })).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
