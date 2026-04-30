using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Infrastructure.Persistence;
using CurateDS.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Api.Configuration;

internal static class PersistenceConfiguration
{
    public static IServiceCollection AddCurateDsPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var useInMemoryDatabase = configuration.GetValue<bool>("Testing:UseInMemoryDatabase");

        services.AddDbContext<CatalogDbContext>(options =>
        {
            if (useInMemoryDatabase)
            {
                var databaseName = configuration["Testing:DatabaseName"] ?? "curateds-tests";
                options.UseInMemoryDatabase(databaseName);
                return;
            }

            options.UseNpgsql(configuration.GetConnectionString("CatalogDb"));
        });

        services.AddScoped<ICollectionRepository, CollectionRepository>();
        services.AddScoped<IAttributeDefinitionRepository, AttributeDefinitionRepository>();
        services.AddScoped<IItemRepository, ItemRepository>();
        services.AddScoped<IItemEventRepository, ItemEventRepository>();
        services.AddScoped<ILocationRepository, LocationRepository>();
        services.AddScoped<ITagRepository, TagRepository>();

        return services;
    }

    public static async Task MigrateDatabaseAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();

        if (dbContext.Database.IsRelational())
        {
            await dbContext.Database.MigrateAsync();
        }
        else
        {
            await dbContext.Database.EnsureCreatedAsync();
        }
    }
}
