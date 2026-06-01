using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.CreateLocation;
using CurateDS.Application.Collections.CreateTag;
using CurateDS.Application.Collections.DeleteLocation;
using CurateDS.Application.Collections.DeleteTag;
using CurateDS.Application.Collections.ListLocations;
using CurateDS.Application.Collections.ListTags;
using CurateDS.Application.Collections.UpdateLocation;
using CurateDS.Application.Collections.UpdateTag;
using CurateDS.Application.Common;
using FluentValidation;

namespace CurateDS.Api.Collections;

public static class OrganizationEndpoints
{
    public static IEndpointRouteBuilder MapOrganizationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/tags", async (
            ListTagsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            var tags = await service.ExecuteAsync(new ListTagsQuery(ownerId), cancellationToken);
            return Results.Ok(tags.Select(tag => new TagResponse(tag.Id, tag.Name, tag.Key, tag.CreatedUtc)));
        }).RequireAuthorization();

        app.MapPost("/tags", async (
            CreateTagRequest request,
            CreateTagService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(new CreateTagCommand(ownerId, request.Name), cancellationToken);
                return Results.Created($"/tags/{result.Id}", new TagResponse(result.Id, result.Name, result.Key, result.CreatedUtc));
            }
            catch (ValidationException exception)
            {
                return ApiResponses.Validation(exception);
            }
        }).RequireAuthorization();

        app.MapDelete("/tags/{tagId:guid}", async (
            Guid tagId,
            DeleteTagService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            try
            {
                await service.ExecuteAsync(new DeleteTagCommand(ownerId, tagId), cancellationToken);
                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Tag was not found.");
            }
        }).RequireAuthorization();

        app.MapPut("/tags/{tagId:guid}", async (
            Guid tagId,
            UpdateTagRequest request,
            UpdateTagService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            try
            {
                var result = await service.ExecuteAsync(
                    new UpdateTagCommand(ownerId, tagId, request.Name),
                    cancellationToken);
                return Results.Ok(new TagResponse(result.Id, result.Name, result.Key, result.CreatedUtc));
            }
            catch (ValidationException exception)
            {
                return ApiResponses.Validation(exception);
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Tag was not found.");
            }
        }).RequireAuthorization();

        app.MapGet("/locations", async (
            ListLocationsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            var locations = await service.ExecuteAsync(new ListLocationsQuery(ownerId), cancellationToken);
            return Results.Ok(locations.Select(location => new LocationResponse(
                location.Id,
                location.Name,
                location.Description,
                location.CreatedUtc)));
        }).RequireAuthorization();

        app.MapPost("/locations", async (
            CreateLocationRequest request,
            CreateLocationService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new CreateLocationCommand(ownerId, request.Name, request.Description),
                    cancellationToken);

                return Results.Created(
                    $"/locations/{result.Id}",
                    new LocationResponse(result.Id, result.Name, result.Description, result.CreatedUtc));
            }
            catch (ValidationException exception)
            {
                return ApiResponses.Validation(exception);
            }
        }).RequireAuthorization();

        app.MapDelete("/locations/{locationId:guid}", async (
            Guid locationId,
            DeleteLocationService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            try
            {
                await service.ExecuteAsync(new DeleteLocationCommand(ownerId, locationId), cancellationToken);
                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Location was not found.");
            }
        }).RequireAuthorization();

        app.MapPut("/locations/{locationId:guid}", async (
            Guid locationId,
            UpdateLocationRequest request,
            UpdateLocationService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            try
            {
                var result = await service.ExecuteAsync(
                    new UpdateLocationCommand(ownerId, locationId, request.Name, request.Description),
                    cancellationToken);
                return Results.Ok(new LocationResponse(result.Id, result.Name, result.Description, result.CreatedUtc));
            }
            catch (ValidationException exception)
            {
                return ApiResponses.Validation(exception);
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Location was not found.");
            }
        }).RequireAuthorization();

        return app;
    }
}
