using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.CreateItemType;
using CurateDS.Application.Collections.DeleteItemType;
using CurateDS.Application.Collections.ListItemTypes;
using CurateDS.Application.Common;
using FluentValidation;

namespace CurateDS.Api.Collections;

public static class ItemTypeEndpoints
{
    public static IEndpointRouteBuilder MapItemTypeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections").RequireAuthorization();

        group.MapGet("/{collectionId:guid}/item-types", async (
            Guid collectionId,
            ListItemTypesService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var itemTypes = await service.ExecuteAsync(
                    new ListItemTypesQuery(ownerId, collectionId),
                    cancellationToken);

                return Results.Ok(itemTypes.Select(it =>
                    new ItemTypeResponse(it.Id, it.CollectionId, it.Name, it.SortOrder, it.CreatedUtc)));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        }).RequireAuthorization();

        group.MapPost("/{collectionId:guid}/item-types", async (
            Guid collectionId,
            CreateItemTypeRequest request,
            CreateItemTypeService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new CreateItemTypeCommand(ownerId, collectionId, request.Name),
                    cancellationToken);

                return Results.Created(
                    $"/collections/{collectionId}/item-types/{result.Id}",
                    new ItemTypeResponse(result.Id, result.CollectionId, result.Name, result.SortOrder, result.CreatedUtc));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
            catch (ValidationException exception)
            {
                return ApiResponses.Validation(exception);
            }
        }).RequireAuthorization();

        group.MapDelete("/{collectionId:guid}/item-types/{itemTypeId:guid}", async (
            Guid collectionId,
            Guid itemTypeId,
            DeleteItemTypeService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            try
            {
                await service.ExecuteAsync(
                    new DeleteItemTypeCommand(ownerId, collectionId, itemTypeId),
                    cancellationToken);
                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Item type was not found.");
            }
        }).RequireAuthorization();

        return app;
    }
}
