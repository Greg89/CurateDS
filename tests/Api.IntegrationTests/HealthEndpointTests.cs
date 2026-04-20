using FluentAssertions;

namespace CurateDS.Api.IntegrationTests;

public sealed class HealthEndpointTests : IClassFixture<CollectionApiFactory>
{
    private readonly CollectionApiFactory _factory;

    public HealthEndpointTests(CollectionApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetRoot_ShouldReturnSuccessStatusCode()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/");

        response.IsSuccessStatusCode.Should().BeTrue();
    }
}
