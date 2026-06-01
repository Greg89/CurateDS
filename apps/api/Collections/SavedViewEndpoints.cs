using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.CreateSavedView;
using FluentValidation;
using CurateDS.Application.Collections.DeleteSavedView;
using CurateDS.Application.Collections.ListSavedViews;
using CurateDS.Application.Common;

namespace CurateDS.Api.Collections;

public static class SavedViewEndpoints
{
    public static IEndpointRouteBuilder MapSavedViewEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections").RequireAuthorization();

        group.MapGet("/{collectionId:guid}/saved-views", async (
            Guid collectionId,
            ListSavedViewsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var views = await service.ExecuteAsync(
                    new ListSavedViewsQuery(ownerId, collectionId),
                    cancellationToken);

                return Results.Ok(views.Select(v =>
                    new SavedViewResponse(v.Id, v.CollectionId, v.Name, v.FiltersJson, v.CreatedUtc)));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        });

        group.MapPost("/{collectionId:guid}/saved-views", async (
            Guid collectionId,
            CreateSavedViewRequest request,
            CreateSavedViewService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var view = await service.ExecuteAsync(
                    new CreateSavedViewCommand(ownerId, collectionId, request.Name, request.FiltersJson),
                    cancellationToken);

                return Results.Created(
                    $"/collections/{collectionId}/saved-views/{view.Id}",
                    new SavedViewResponse(view.Id, view.CollectionId, view.Name, view.FiltersJson, view.CreatedUtc));
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

        group.MapDelete("/{collectionId:guid}/saved-views/{viewId:guid}", async (
            Guid collectionId,
            Guid viewId,
            DeleteSavedViewService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                await service.ExecuteAsync(
                    new DeleteSavedViewCommand(ownerId, collectionId, viewId),
                    cancellationToken);

                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Saved view was not found.");
            }
        });

        return app;
    }
}
