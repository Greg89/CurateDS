using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, configurationBuilder) =>
        {
            configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Testing:UseInMemoryDatabase"] = "true",
                ["Testing:DatabaseName"] = $"curateds-api-tests-{Guid.NewGuid()}",
                // Storage settings used by MinioMediaStorageService.GetPublicUrl. Endpoint/AccessKey/SecretKey
                // are not exercised in tests because no upload network calls are made; only URL composition matters.
                ["Storage:PublicBaseUrl"] = "https://cdn.test.example",
                ["Storage:BucketName"] = "test-bucket"
            });
        });
        builder.ConfigureServices(services =>
        {
            // Replace the JWT Bearer scheme with a test handler that always authenticates.
            services.AddAuthentication("Test")
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
        });
    }
}
