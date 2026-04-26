using CurateDS.Api.Collections;
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
using CurateDS.Application.Collections.GetItemDetail;
using CurateDS.Application.Collections.ListAttributeDefinitions;
using CurateDS.Application.Collections.ListCollections;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Collections.ListLocations;
using CurateDS.Application.Collections.ListTags;
using CurateDS.Application.Collections.UpdateItem;
using CurateDS.Infrastructure;
using CurateDS.Infrastructure.Persistence;
using CurateDS.Infrastructure.Persistence.Repositories;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
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
builder.Services.AddScoped<GetItemDetailService>();
builder.Services.AddScoped<ListAttributeDefinitionsService>();
builder.Services.AddScoped<ListCollectionsService>();
builder.Services.AddScoped<ListItemsService>();
builder.Services.AddScoped<ListLocationsService>();
builder.Services.AddScoped<ListTagsService>();
builder.Services.AddScoped<UpdateItemService>();

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

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler();
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
app.MapHealthChecks("/health");

app.Run();

public partial class Program
{
    protected Program()
    {
    }
}
