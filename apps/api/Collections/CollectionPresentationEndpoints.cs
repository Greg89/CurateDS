using System.Text.Json.Serialization;
using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.CollectionPresentation;
using CurateDS.Application.Common;
using FluentValidation;

namespace CurateDS.Api.Collections;

public sealed record UpdateCollectionPresentationRequest([property: JsonRequired] bool ShowCover, [property: JsonRequired] bool ShowSummary,
    [property: JsonRequired] bool ShowPinnedItems, [property: JsonRequired] bool ShowRecentItems, IReadOnlyList<Guid> PinnedItemIds);

public static class CollectionPresentationEndpoints
{
    public static IEndpointRouteBuilder MapCollectionPresentationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections/{collectionId:guid}/presentation").RequireAuthorization();
        group.MapGet("", async (Guid collectionId, CollectionPresentationService service,
            ICurrentUserService user, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.GetAsync(user.GetCurrentUser(), collectionId, ct)); }
            catch (NotFoundException) { return ApiResponses.NotFound("Collection was not found."); }
        }).Produces<CollectionPresentationDto>();
        group.MapPut("", async (Guid collectionId, UpdateCollectionPresentationRequest request,
            CollectionPresentationService service, ICurrentUserService user, CancellationToken ct) =>
        {
            try
            {
                return Results.Ok(await service.UpdateAsync(new(user.GetCurrentUser(), collectionId,
                    request.ShowCover, request.ShowSummary, request.ShowPinnedItems, request.ShowRecentItems,
                    request.PinnedItemIds), ct));
            }
            catch (NotFoundException) { return ApiResponses.NotFound("Collection was not found."); }
            catch (ValidationException error) { return ApiResponses.Validation(error); }
        }).Produces<CollectionPresentationDto>();
        return app;
    }
}
