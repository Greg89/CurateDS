using CurateDS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Formatting.Compact;
using Serilog.Sinks.Seq;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(new RenderedCompactJsonFormatter());

    var seqUrl = context.Configuration["Serilog:SeqUrl"];
    var seqApiKey = context.Configuration["Serilog:SeqApiKey"];

    if (!string.IsNullOrWhiteSpace(seqUrl))
    {
        configuration.WriteTo.Seq(seqUrl, apiKey: seqApiKey);
    }
});

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("CatalogDb")));

builder.Services.AddHealthChecks()
    .AddDbContextCheck<CatalogDbContext>("catalog-db");

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseExceptionHandler();

app.MapGet("/ready", () => Results.Ok(new
{
    status = "ready",
    utc = DateTime.UtcNow
}));

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/", () => Results.Ok(new
{
    name = "CurateDS API",
    status = "ok",
    utc = DateTime.UtcNow
}));

app.MapHealthChecks("/health");

app.Run();

public partial class Program;
