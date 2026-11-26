using System.Net;
using System.Net.Http.Json;
using CurateDS.Api.Collections;
using CurateDS.Application.Collections;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionInsightsApiTests(CollectionApiFactory factory) : IClassFixture<CollectionApiFactory>
{
    [Fact]
    public async Task InsightsAndSavedDrillThrough_ShouldRemainCollectionScoped()
    {
        using var client = factory.CreateClient();
        var create = await client.PostAsJsonAsync("/collections", new { name = "Insight collection" });
        var collection = (await create.Content.ReadFromJsonAsync<CollectionResponse>())!;
        var definitionResponse = await client.PostAsJsonAsync($"/collections/{collection.Id}/attribute-definitions", new {
            name = "Colour", dataType = "Text", isRequired = false, isFilterable = true, sortOrder = 0
        });
        definitionResponse.EnsureSuccessStatusCode();
        var definition = (await definitionResponse.Content.ReadFromJsonAsync<AttributeDefinitionResponse>(new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web) { Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() } }))!;
        foreach (var value in new[] { "Red", "Redwood" })
            (await client.PostAsJsonAsync($"/collections/{collection.Id}/items", new { name = $"A {value} item", quantity = 1,
                attributeValues = new[] { new { attributeDefinitionId = definition.Id, value } } })).EnsureSuccessStatusCode();
        var insights = await client.GetFromJsonAsync<CollectionInsightsDto>($"/collections/{collection.Id}/insights?attributeDefinitionId={definition.Id}");
        insights!.Summary.TotalItems.Should().Be(2);
        insights.Attribute!.Values.Should().HaveCount(2);
        var filters = $$"""{"exactAttributeKey":"{{definition.Key}}","exactAttributeValue":"Red","hasNoItemType":true,"tagMatchMode":"any"}""";
        var savedResponse = await client.PostAsJsonAsync($"/collections/{collection.Id}/saved-views", new { name = "Red things", filtersJson = filters });
        savedResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var saved = (await savedResponse.Content.ReadFromJsonAsync<SavedViewResponse>())!;
        var views = await client.GetFromJsonAsync<SavedViewResponse[]>($"/collections/{collection.Id}/saved-views");
        views.Should().ContainSingle(view => view.Id == saved.Id && view.FiltersJson == filters);
        var items = await client.GetFromJsonAsync<PagedItemsResponse>($"/collections/{collection.Id}/items?exactAttributeKey={definition.Key}&exactAttributeValue=Red&hasNoItemType=true&page=1&pageSize=12");
        items!.Items.Should().ContainSingle().Which.Name.Should().Be("A Red item");
        var foreign = Collection.Create("other-owner", "Private collection", DateTime.UtcNow, "other-owner");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            db.Collections.Add(foreign); await db.SaveChangesAsync();
        }
        (await client.GetAsync($"/collections/{foreign.Id}/insights")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.GetAsync($"/collections/{collection.Id}/insights?attributeDefinitionId={Guid.NewGuid()}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.DeleteAsync($"/collections/{foreign.Id}/saved-views/{saved.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.DeleteAsync($"/collections/{collection.Id}/saved-views/{saved.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
