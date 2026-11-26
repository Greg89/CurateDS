using System.Threading.RateLimiting;
using CurateDS.Application.Publications;
using CurateDS.Infrastructure.Publications;
using CurateDS.Infrastructure.Storage;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace CurateDS.Api.Configuration;

internal static class PublicationConfiguration
{
    public static Task TransformSchemaAsync(OpenApiSchema schema, OpenApiSchemaTransformerContext context, CancellationToken ct)
    {
        if (context.JsonTypeInfo.Type.Namespace == typeof(PublicShowcase).Namespace && context.JsonTypeInfo.Type.Name.StartsWith("Public", StringComparison.Ordinal))
            schema.AdditionalPropertiesAllowed = false;
        if (context.JsonTypeInfo.Type == typeof(PublicShowcase))
            foreach (var name in new[] { "summary", "highlights", "recent", "growth", "types" })
            {
                // JsonIgnore(WhenWritingNull) omits these output sections; constructor parameters alone
                // otherwise make OpenAPI incorrectly describe them as required nullable properties.
                schema.Required?.Remove(name);
                if (schema.Properties?[name] is OpenApiSchema property)
                {
                    property.Type &= ~JsonSchemaType.Null;
                    if (property.OneOf is not null) property.OneOf = property.OneOf.Where(s => s.Type != JsonSchemaType.Null).ToList();
                }
            }
        return Task.CompletedTask;
    }
    public static IServiceCollection AddPublications(this IServiceCollection services, IConfiguration config)
    {
        if (config.GetValue<bool>("Publication:Enabled") && !config.GetValue<bool>("Storage:EnforcePrivateReadPolicy"))
            throw new InvalidOperationException("Publishing requires explicit private storage policy enforcement.");
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IPublicationService, PublicationService>();
        services.AddScoped<IPublicationStorage, MinioMediaStorageService>();
        services.AddSingleton<IPublicationImageProcessor, PublicationImageProcessor>();
        services.AddHostedService<PublicationCleanupWorker>();
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = 429;
            options.AddPolicy("publication-previews", context => RateLimitPartition.GetFixedWindowLimiter(
                context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "anonymous",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = Math.Clamp(config.GetValue("Publication:PreviewsPerMinute", 5), 1, 60),
                    Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
            options.AddPolicy("publication-reads", context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = Math.Clamp(config.GetValue("Publication:ReadsPerMinute", 120), 1, 1000),
                    Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
        });
        return services;
    }
}

internal sealed class PublicationCleanupWorker(IServiceScopeFactory scopes, IConfiguration config,
    ILogger<PublicationCleanupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!config.GetValue<bool>("Publication:Enabled")) return;
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(2));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<IPublicationService>().CleanupAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception) { logger.LogWarning("Publication derivative cleanup will retry on the next interval."); }
        }
    }
}
