using FluentAssertions;

namespace CurateDS.Api.IntegrationTests;

public sealed class CorsTests : IClassFixture<CollectionApiFactory>
{
    private readonly HttpClient _client;

    public CorsTests(CollectionApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetCollections_ShouldIncludeCorsHeader_ForConfiguredOrigin()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/collections");
        request.Headers.Add("Origin", "http://localhost:3000");

        using var response = await _client.SendAsync(request);

        response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values).Should().BeTrue();
        values.Should().ContainSingle("http://localhost:3000");
    }
}
