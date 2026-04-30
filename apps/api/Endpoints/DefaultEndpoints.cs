namespace CurateDS.Api.Endpoints;

internal static class DefaultEndpoints
{
    public static IEndpointRouteBuilder MapDefaultEndpoints(this WebApplication app)
    {
        app.MapGet("/", () => Results.Ok(new
        {
            name = "CurateDS API",
            status = "ok",
            utc = DateTime.UtcNow
        }));

        app.MapGet("/ready", () => Results.Ok(new
        {
            status = "ready",
            utc = DateTime.UtcNow
        }));

        app.MapHealthChecks("/health");

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        return app;
    }
}
