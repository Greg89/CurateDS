using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateAttributeDefinition;
using CurateDS.Application.Collections.CreateCollection;
using CurateDS.Application.Collections.ListAttributeDefinitions;
using CurateDS.Application.Collections.ListCollections;
using CurateDS.Application.Common;
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

        group.MapGet("/{collectionId:guid}/attribute-definitions", async (
            Guid collectionId,
            ListAttributeDefinitionsService service,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
                var attributeDefinitions = await service.ExecuteAsync(
                    new ListAttributeDefinitionsQuery(ownerId, collectionId),
                    cancellationToken);

                return Results.Ok(attributeDefinitions.Select(ToResponse));
            }
            catch (NotFoundException)
            {
                return Results.NotFound();
            }
        });

        group.MapPost("/{collectionId:guid}/attribute-definitions", async (
            Guid collectionId,
            CreateAttributeDefinitionRequest request,
            CreateAttributeDefinitionService service,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
                var result = await service.ExecuteAsync(
                    new CreateAttributeDefinitionCommand(
                        ownerId,
                        collectionId,
                        request.Name,
                        request.DataType,
                        request.IsRequired,
                        request.IsFilterable),
                    cancellationToken);

                return Results.Created(
                    $"/collections/{collectionId}/attribute-definitions/{result.Id}",
                    ToResponse(new AttributeDefinitionDto(
                        result.Id,
                        result.CollectionId,
                        result.Name,
                        result.Key,
                        result.DataType,
                        result.IsRequired,
                        result.IsFilterable,
                        result.SortOrder,
                        result.CreatedUtc)));
            }
            catch (ValidationException exception)
            {
                return Results.ValidationProblem(exception.Errors
                    .GroupBy(error => error.PropertyName)
                    .ToDictionary(
                        group => group.Key,
                        group => group.Select(error => error.ErrorMessage).ToArray()));
            }
            catch (NotFoundException)
            {
                return Results.NotFound();
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

    private static AttributeDefinitionResponse ToResponse(AttributeDefinitionDto attributeDefinition) =>
        new(
            attributeDefinition.Id,
            attributeDefinition.CollectionId,
            attributeDefinition.Name,
            attributeDefinition.Key,
            attributeDefinition.DataType,
            attributeDefinition.IsRequired,
            attributeDefinition.IsFilterable,
            attributeDefinition.SortOrder,
            attributeDefinition.CreatedUtc);
}
