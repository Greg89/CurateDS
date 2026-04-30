using System.Text.Json;
using CurateDS.Api.Observability;
using Microsoft.AspNetCore.Diagnostics;

namespace CurateDS.Api.Middleware;

internal static class ProductionExceptionHandler
{
    /// <summary>
    /// Registers the developer exception page in development and a structured
    /// production handler that writes a generic body (correlation ID echoed in
    /// header) while logging the full exception to Serilog/Seq.
    /// </summary>
    public static IApplicationBuilder UseCurateDsExceptionHandler(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
            return app;
        }

        app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
        {
            var feature = context.Features.Get<IExceptionHandlerFeature>();
            var ex = feature?.Error;

            if (ex is not null)
            {
                var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "Unhandled exception on {Method} {Path}",
                    context.Request.Method, context.Request.Path);
            }

            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";

            // Generic response body — full detail is captured in structured logs (Seq).
            // Correlation ID is echoed via the X-Correlation-ID header so a caller
            // can quote it when reporting an issue.
            var correlationId = context.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var cid)
                ? cid as string
                : null;

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(new
                {
                    error = "An unexpected error occurred.",
                    correlationId
                }));
        }));

        return app;
    }
}
