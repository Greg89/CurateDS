using System.Text.Json.Serialization;
using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.ShowcaseSettings;
using CurateDS.Application.Common;
using FluentValidation;

namespace CurateDS.Api.Collections;

public sealed record UpdateShowcaseSettingsRequest(string Layout,
    [property: JsonRequired] bool ShowGrowth, [property: JsonRequired] bool ShowTypes);

public static class ShowcaseSettingsEndpoints
{
    public static IEndpointRouteBuilder MapShowcaseSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections/{collectionId:guid}/showcase-settings").RequireAuthorization();
        group.MapGet("", async (Guid collectionId, ShowcaseSettingsService service,
            ICurrentUserService user, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.GetAsync(user.GetCurrentUser(), collectionId, ct)); }
            catch (NotFoundException) { return ApiResponses.NotFound("Collection was not found."); }
        }).Produces<ShowcaseSettingsDto>();
        group.MapPut("", async (Guid collectionId, UpdateShowcaseSettingsRequest request,
            ShowcaseSettingsService service, ICurrentUserService user, CancellationToken ct) =>
        {
            try
            {
                return Results.Ok(await service.UpdateAsync(user.GetCurrentUser(), collectionId,
                    request.Layout, request.ShowGrowth, request.ShowTypes, ct));
            }
            catch (NotFoundException) { return ApiResponses.NotFound("Collection was not found."); }
            catch (ValidationException error) { return ApiResponses.Validation(error); }
        }).Produces<ShowcaseSettingsDto>();
        return app;
    }
}
