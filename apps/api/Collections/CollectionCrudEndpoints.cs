using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateCollection;
using CurateDS.Application.Collections.DeleteCollection;
using CurateDS.Application.Collections.ListCollections;
using CurateDS.Application.Common;
using FluentValidation;

namespace CurateDS.Api.Collections;

public static class CollectionCrudEndpoints
{
    public static IEndpointRouteBuilder MapCollectionCrudEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections").RequireAuthorization();

        group.MapGet("/", async (
            ListCollectionsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            var collections = await service.ExecuteAsync(new ListCollectionsQuery(ownerId), cancellationToken);

            return Results.Ok(collections.Select(CollectionResponseMappers.ToCollectionResponse));
        });

        group.MapPost("/", async (
            CreateCollectionRequest request,
            CreateCollectionService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new CreateCollectionCommand(ownerId, request.Name),
                    cancellationToken);

                return Results.Created($"/collections/{result.Id}", CollectionResponseMappers.ToCollectionResponse(
                    new CollectionDto(result.Id, result.Name, result.CreatedUtc)));
            }
            catch (ValidationException exception)
            {
                return ApiResponses.Validation(exception);
            }
        });

        group.MapDelete("/{collectionId:guid}", async (
            Guid collectionId,
            DeleteCollectionService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                await service.ExecuteAsync(
                    new DeleteCollectionCommand(ownerId, collectionId),
                    cancellationToken);

                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        });

        return app;
    }
}
