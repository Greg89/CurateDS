using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateAttributeDefinition;
using CurateDS.Application.Collections.DeleteAttributeDefinition;
using CurateDS.Application.Collections.ListAttributeDefinitions;
using CurateDS.Application.Common;
using FluentValidation;

namespace CurateDS.Api.Collections;

public static class AttributeDefinitionEndpoints
{
    public static IEndpointRouteBuilder MapAttributeDefinitionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections").RequireAuthorization();

        group.MapGet("/{collectionId:guid}/attribute-definitions", async (
            Guid collectionId,
            ListAttributeDefinitionsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var attributeDefinitions = await service.ExecuteAsync(
                    new ListAttributeDefinitionsQuery(ownerId, collectionId),
                    cancellationToken);

                return Results.Ok(attributeDefinitions.Select(CollectionResponseMappers.ToAttributeDefinitionResponse));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        });

        group.MapPost("/{collectionId:guid}/attribute-definitions", async (
            Guid collectionId,
            CreateAttributeDefinitionRequest request,
            CreateAttributeDefinitionService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new CreateAttributeDefinitionCommand(
                        ownerId,
                        collectionId,
                        request.Name,
                        request.DataType,
                        request.IsRequired,
                        request.IsFilterable,
                        request.ItemTypeId),
                    cancellationToken);

                return Results.Created(
                    $"/collections/{collectionId}/attribute-definitions/{result.Id}",
                    CollectionResponseMappers.ToAttributeDefinitionResponse(new AttributeDefinitionDto(
                        result.Id,
                        result.CollectionId,
                        result.Name,
                        result.Key,
                        result.DataType,
                        result.IsRequired,
                        result.IsFilterable,
                        result.SortOrder,
                        result.ItemTypeId,
                        result.CreatedUtc)));
            }
            catch (ValidationException exception)
            {
                return ApiResponses.Validation(exception);
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        });

        group.MapDelete("/{collectionId:guid}/attribute-definitions/{attributeDefinitionId:guid}", async (
            Guid collectionId,
            Guid attributeDefinitionId,
            DeleteAttributeDefinitionService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            try
            {
                await service.ExecuteAsync(
                    new DeleteAttributeDefinitionCommand(ownerId, collectionId, attributeDefinitionId),
                    cancellationToken);
                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Attribute definition was not found.");
            }
        }).RequireAuthorization();

        return app;
    }
}
