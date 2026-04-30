using System.Reflection;
using System.Security.Claims;
using CurateDS.Api.Collections;
using CurateDS.Api.Observability;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using CurateDS.Application.Collections.CreateAttributeDefinition;
using CurateDS.Application.Collections.CreateCollection;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.CreateLocation;
using CurateDS.Application.Collections.CreateTag;
using CurateDS.Application.Collections.DeleteCollection;
using CurateDS.Application.Collections.DeleteItem;
using CurateDS.Application.Collections.DeleteTag;
using CurateDS.Application.Collections.DeleteLocation;
using CurateDS.Application.Collections.DeleteAttributeDefinition;
using CurateDS.Application.Collections.DeleteItemMedia;
using CurateDS.Application.Collections.GetItemDetail;
using CurateDS.Application.Collections.ListAttributeDefinitions;
using CurateDS.Application.Collections.ListCollections;
using CurateDS.Application.Collections.ListItemEvents;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Collections.ListLocations;
using CurateDS.Application.Collections.ListTags;
using CurateDS.Application.Collections.SetPrimaryItemMedia;
using CurateDS.Application.Collections.UpdateItem;
using CurateDS.Application.Collections.UploadItemMedia;
using CurateDS.Infrastructure;
using CurateDS.Infrastructure.Persistence;
using CurateDS.Infrastructure.Persistence.Repositories;
using CurateDS.Infrastructure.Storage;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using Serilog;
using Serilog.Formatting.Compact;
using Serilog.Sinks.Seq;

var builder = WebApplication.CreateBuilder(args);

var serviceVersion = Assembly.GetEntryAssembly()
    ?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
    ?.InformationalVersion
    ?? Assembly.GetEntryAssembly()?.GetName().Version?.ToString()
    ?? "unknown";

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithEnvironmentName()
        .Enrich.WithThreadId()
        .Enrich.WithProperty("Service", "catalog-api")
        .Enrich.WithProperty("Version", serviceVersion)
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
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var auth0Domain = builder.Configuration["Auth0:Domain"] ?? string.Empty;
var auth0Audience = builder.Configuration["Auth0:Audience"] ?? string.Empty;

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://{auth0Domain}/";
        options.Audience = auth0Audience;
    });

builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy =>
    {
        if (allowedOrigins.Length == 0)
        {
            return;
        }

        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var useInMemoryDatabase = builder.Configuration.GetValue<bool>("Testing:UseInMemoryDatabase");

builder.Services.AddDbContext<CatalogDbContext>(options =>
{
    if (useInMemoryDatabase)
    {
        var databaseName = builder.Configuration["Testing:DatabaseName"] ?? "curateds-tests";
        options.UseInMemoryDatabase(databaseName);
        return;
    }

    options.UseNpgsql(builder.Configuration.GetConnectionString("CatalogDb"));
});

builder.Services.AddScoped<ICollectionRepository, CollectionRepository>();
builder.Services.AddScoped<IAttributeDefinitionRepository, AttributeDefinitionRepository>();
builder.Services.AddScoped<IItemRepository, ItemRepository>();
builder.Services.AddScoped<IItemEventRepository, ItemEventRepository>();
builder.Services.AddScoped<ILocationRepository, LocationRepository>();
builder.Services.AddScoped<ITagRepository, TagRepository>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IValidator<CreateAttributeDefinitionCommand>, CreateAttributeDefinitionCommandValidator>();
builder.Services.AddScoped<IValidator<CreateCollectionCommand>, CreateCollectionCommandValidator>();
builder.Services.AddScoped<IValidator<CreateItemCommand>, CreateItemCommandValidator>();
builder.Services.AddScoped<IValidator<CreateLocationCommand>, CreateLocationCommandValidator>();
builder.Services.AddScoped<IValidator<CreateTagCommand>, CreateTagCommandValidator>();
builder.Services.AddScoped<IValidator<UpdateItemCommand>, UpdateItemCommandValidator>();
builder.Services.AddScoped<CreateAttributeDefinitionService>();
builder.Services.AddScoped<CreateCollectionService>();
builder.Services.AddScoped<CreateItemService>();
builder.Services.AddScoped<CreateLocationService>();
builder.Services.AddScoped<CreateTagService>();
builder.Services.AddScoped<DeleteCollectionService>();
builder.Services.AddScoped<DeleteItemService>();
builder.Services.AddScoped<DeleteTagService>();
builder.Services.AddScoped<DeleteLocationService>();
builder.Services.AddScoped<DeleteAttributeDefinitionService>();
builder.Services.AddScoped<GetItemDetailService>();
builder.Services.AddScoped<ListAttributeDefinitionsService>();
builder.Services.AddScoped<ListCollectionsService>();
builder.Services.AddScoped<ListItemsService>();
builder.Services.AddScoped<ListItemEventsService>();
builder.Services.AddScoped<ListLocationsService>();
builder.Services.AddScoped<ListTagsService>();
builder.Services.AddScoped<UpdateItemService>();

builder.Services.Configure<MediaStorageOptions>(
    builder.Configuration.GetSection(MediaStorageOptions.SectionName));
builder.Services.AddScoped<IMediaStorageService, MinioMediaStorageService>();
builder.Services.AddScoped<UploadItemMediaService>();
builder.Services.AddScoped<DeleteItemMediaService>();
builder.Services.AddScoped<SetPrimaryItemMediaService>();

builder.Services.AddHealthChecks()
    .AddDbContextCheck<CatalogDbContext>("catalog-db");

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
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

app.UseMiddleware<CorrelationIdMiddleware>();

app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        var userId = httpContext.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(userId))
        {
            diagnosticContext.Set("UserId", userId);
        }

        if (httpContext.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var correlationId)
            && correlationId is string correlationIdValue)
        {
            diagnosticContext.Set("CorrelationId", correlationIdValue);
        }

        diagnosticContext.Set("ClientIp", httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());

        // Auto-enrich the request log with route-derived domain identifiers and a
        // human-friendly Feature name. This means every request log line carries
        // the entity context without each endpoint having to opt in.
        var endpoint = httpContext.GetEndpoint();
        if (endpoint is Microsoft.AspNetCore.Routing.RouteEndpoint routeEndpoint)
        {
            var feature = $"{httpContext.Request.Method} /{routeEndpoint.RoutePattern.RawText?.TrimStart('/')}";
            diagnosticContext.Set("Feature", feature);
        }

        var routeValues = httpContext.Request.RouteValues;
        foreach (var routeKey in DiagnosticRouteKeys)
        {
            if (routeValues.TryGetValue(routeKey.RouteName, out var raw)
                && raw is not null
                && !string.IsNullOrWhiteSpace(raw.ToString()))
            {
                diagnosticContext.Set(routeKey.LogProperty, raw.ToString()!);
            }
        }
    };
});

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
    {
        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
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
            System.Text.Json.JsonSerializer.Serialize(new
            {
                error = "An unexpected error occurred.",
                correlationId
            }));
    }));
}

app.UseCors("WebClient");
app.UseAuthentication();
app.UseAuthorization();

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

app.MapCollectionEndpoints();
app.MapMediaEndpoints();
app.MapHealthChecks("/health");

app.Logger.LogInformation(
    "CurateDS API starting. Environment={Environment} Version={Version} SeqConfigured={SeqConfigured}",
    app.Environment.EnvironmentName,
    serviceVersion,
    !string.IsNullOrWhiteSpace(app.Configuration["Serilog:SeqUrl"]));

app.Run();

public partial class Program
{
    // Route parameter names → log property names. Whenever a request matches a
    // route that has one of these segments, the request log will carry the value.
    private static readonly IReadOnlyList<(string RouteName, string LogProperty)> DiagnosticRouteKeys =
    [
        ("collectionId", "CollectionId"),
        ("itemId", "ItemId"),
        ("mediaAssetId", "MediaAssetId"),
        ("attributeDefinitionId", "AttributeDefinitionId"),
        ("locationId", "LocationId"),
        ("tagId", "TagId")
    ];

    protected Program()
    {
    }
}
