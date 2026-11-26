using System.Net;
using System.Net.Http.Json;
using CurateDS.Api.Collections;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace CurateDS.Api.IntegrationTests;

public sealed class UpdateCollectionTests(CollectionApiFactory factory) : IClassFixture<CollectionApiFactory>
{
    [Fact]
    public async Task Update_ShouldPersistIdentityAndPreserveItemsAndCreation()
    {
        using var client = factory.CreateClient();
        var created = (await (await client.PostAsJsonAsync("/collections", new { name = "Original shelf" }))
            .Content.ReadFromJsonAsync<CollectionResponse>())!;
        (await client.PostAsJsonAsync($"/collections/{created.Id}/items", new { name = "Kept book", quantity = 1 })).EnsureSuccessStatusCode();
        var response = await client.PutAsJsonAsync($"/collections/{created.Id}", new {
            name = "  New shelf  ", category = " Books ", description = " A personal library ",
            coverImageUrl = "https://example.org/cover.jpg", color = "slate",
            ownerId = "forged-owner", createdUtc = "2000-01-01T00:00:00Z"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = (await response.Content.ReadFromJsonAsync<CollectionResponse>())!;
        updated.Id.Should().Be(created.Id);
        updated.CreatedUtc.Should().Be(created.CreatedUtc);
        updated.Name.Should().Be("New shelf");
        updated.Category.Should().Be("Books");
        updated.Description.Should().Be("A personal library");
        updated.Color.Should().Be("slate");
        (await client.GetFromJsonAsync<CollectionResponse[]>("/collections")).Should().ContainEquivalentOf(updated);
        (await client.GetFromJsonAsync<CollectionSummaryResponse>($"/collections/{created.Id}/summary"))!.TotalItems.Should().Be(1);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            var persisted = await db.Collections.FindAsync(created.Id);
            persisted!.OwnerId.Should().Be("test-user-id");
            persisted.UpdatedBy.Should().Be("test-user-id");
            persisted.UpdatedUtc.Should().NotBeNull();
        }
        var cleared = await client.PutAsJsonAsync($"/collections/{created.Id}", new { name = "New shelf", category = " ", description = "", coverImageUrl = "", color = "" });
        cleared.EnsureSuccessStatusCode();
        var empty = (await cleared.Content.ReadFromJsonAsync<CollectionResponse>())!;
        empty.Category.Should().BeNull();
        empty.Description.Should().BeNull();
        empty.CoverImageUrl.Should().BeNull();
        empty.Color.Should().BeNull();
    }

    [Theory]
    [InlineData("ab", null, "forest")]
    [InlineData("Valid name", "javascript:alert(1)", "forest")]
    [InlineData("Valid name", "https://user:pass@example.org/image.jpg", "forest")]
    [InlineData("Valid name", null, "unknown")]
    public async Task Update_ShouldRejectInvalidIdentityWithoutChangingTheCollection(string name, string? coverImageUrl, string color)
    {
        using var client = factory.CreateClient();
        var original = (await (await client.PostAsJsonAsync("/collections", new { name = "Unchanged shelf" }))
            .Content.ReadFromJsonAsync<CollectionResponse>())!;
        (await client.PutAsJsonAsync($"/collections/{original.Id}", new { name, coverImageUrl, color }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetFromJsonAsync<CollectionResponse[]>("/collections")).Should().ContainEquivalentOf(original);
    }

    [Fact]
    public async Task Update_ShouldRejectForeignMissingAndDeletedCollections()
    {
        var foreign = Collection.Create("other-owner", "Other shelf", DateTime.UtcNow, "other-owner");
        var deleted = Collection.Create("test-user-id", "Deleted shelf", DateTime.UtcNow, "test-user-id");
        deleted.SoftDelete(DateTime.UtcNow, "test-user-id");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            db.Collections.AddRange(foreign, deleted);
            await db.SaveChangesAsync();
        }
        using var client = factory.CreateClient();
        foreach (var id in new[] { foreign.Id, deleted.Id, Guid.NewGuid() })
            (await client.PutAsJsonAsync($"/collections/{id}", new { name = "Forbidden update" }))
                .StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
