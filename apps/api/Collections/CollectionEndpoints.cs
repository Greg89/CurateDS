using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateCollection;
using CurateDS.Application.Collections.ListCollections;
using FluentValidation;

namespace CurateDS.Api.Collections;

public static class CollectionEndpoints
{
    public static IEndpointRouteBuilder MapCollectionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections");

        group.MapGet("/", async (
            ListCollectionsService service,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            var ownerId = GetDefaultOwnerId(configuration);
            var collections = await service.ExecuteAsync(new ListCollectionsQuery(ownerId), cancellationToken);

            return Results.Ok(collections.Select(ToResponse));
        });

        group.MapPost("/", async (
            CreateCollectionRequest request,
            CreateCollectionService service,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
                var result = await service.ExecuteAsync(
                    new CreateCollectionCommand(ownerId, request.Name),
                    cancellationToken);

                return Results.Created($"/collections/{result.Id}", ToResponse(
                    new CollectionDto(result.Id, result.Name, result.CreatedUtc)));
            }
            catch (ValidationException exception)
            {
                return Results.ValidationProblem(exception.Errors
                    .GroupBy(error => error.PropertyName)
                    .ToDictionary(
                        group => group.Key,
                        group => group.Select(error => error.ErrorMessage).ToArray()));
            }
        });

        return app;
    }

    private static Guid GetDefaultOwnerId(IConfiguration configuration)
    {
        var value = configuration["AppDefaults:DefaultOwnerId"];

        if (!Guid.TryParse(value, out var ownerId))
        {
            throw new InvalidOperationException("AppDefaults:DefaultOwnerId must be configured.");
        }

        return ownerId;
    }

    private static CollectionResponse ToResponse(CollectionDto collection) =>
        new(collection.Id, collection.Name, collection.CreatedUtc);
}
