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
        services.AddDbContext<CatalogDbContext>((serviceProvider, options) =>
        {
            var resolvedConfiguration = serviceProvider.GetRequiredService<IConfiguration>();

            if (resolvedConfiguration.GetValue<bool>("Testing:UseInMemoryDatabase"))
            {
                var databaseName = resolvedConfiguration["Testing:DatabaseName"] ?? "curateds-tests";
                options.UseInMemoryDatabase(databaseName);
                return;
            }

            options.UseNpgsql(resolvedConfiguration.GetConnectionString("CatalogDb"));
        });

        services.AddScoped<ICollectionRepository, CollectionRepository>();
        services.AddScoped<IAttributeDefinitionRepository, AttributeDefinitionRepository>();
        services.AddScoped<IItemRepository, ItemRepository>();
        services.AddScoped<IItemEventRepository, ItemEventRepository>();
        services.AddScoped<ILocationRepository, LocationRepository>();
        services.AddScoped<ISavedViewRepository, SavedViewRepository>();
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
