using System.Text.Json.Serialization;
using CurateDS.Api.Collections;
using CurateDS.Api.Configuration;
using CurateDS.Api.Endpoints;
using CurateDS.Api.Middleware;
using CurateDS.Api.Observability;
using CurateDS.Infrastructure.Persistence;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
var serviceVersion = AssemblyVersion.Resolve();

builder.AddCurateDsSerilog(serviceVersion);

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddCurateDsAuthentication(builder.Configuration);
builder.Services.AddCurateDsCors(builder.Configuration);
builder.Services.AddCurateDsPersistence(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddCurateDsMediaStorage(builder.Configuration);

builder.Services.AddHealthChecks()
    .AddDbContextCheck<CatalogDbContext>("catalog-db");

var app = builder.Build();

await app.MigrateDatabaseAsync();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = DiagnosticContextEnrichment.Enrich;
});
app.UseCurateDsExceptionHandler();
app.UseCors(CorsConfiguration.PolicyName);
app.UseAuthentication();
app.UseAuthorization();

app.MapDefaultEndpoints();
app.MapCollectionEndpoints();
app.MapMediaEndpoints();

app.LogStartupBanner(serviceVersion);

app.Run();

public partial class Program
{
    protected Program()
    {
    }
}
