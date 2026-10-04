using CurateDS.Application.Abstractions;
using CurateDS.Application.Common;
using CurateDS.Application.Publications;

namespace CurateDS.Api.Collections;

public static class PublicationEndpoints
{
    public static IEndpointRouteBuilder MapPublicationEndpoints(this IEndpointRouteBuilder app)
    {
        var owner = app.MapGroup("/collections/{collectionId:guid}/publication").RequireAuthorization();
        owner.AddEndpointFilter(new BoundaryFilter(false));
        owner.MapGet("", async (Guid collectionId, IPublicationService service, ICurrentUserService user, CancellationToken ct) =>
            Results.Ok(await service.StatusAsync(user.GetCurrentUser(), collectionId, ct))).Produces<PublicationStatus>();
        owner.MapPost("/previews", async (Guid collectionId, PreparePublication request, IPublicationService service, ICurrentUserService user, CancellationToken ct) =>
            Results.Ok(await service.PrepareAsync(user.GetCurrentUser(), collectionId, request, ct)))
            .RequireRateLimiting("publication-previews").Produces<PublicationPreview>();
        owner.MapGet("/previews/{token:guid}", async (Guid collectionId, Guid token, IPublicationService service, ICurrentUserService user, CancellationToken ct) =>
            Results.Ok(await service.PreviewAsync(user.GetCurrentUser(), collectionId, token, ct))).Produces<PublicationPreview>();
        owner.MapMethods("/previews/{token:guid}/media/{asset:guid}", ["GET", "HEAD"], async (Guid collectionId, Guid token, Guid asset,
            IPublicationService service, ICurrentUserService user, CancellationToken ct) =>
            Image(await service.PreviewImageAsync(user.GetCurrentUser(), collectionId, token, asset, ct)))
            .Produces(200, contentType: "image/jpeg");
        owner.MapPut("", async (Guid collectionId, PublishPublication request, IPublicationService service, ICurrentUserService user, CancellationToken ct) =>
            Results.Ok(await service.PublishAsync(user.GetCurrentUser(), collectionId, request, ct))).Produces<PublicationStatus>();
        owner.MapDelete("", async (Guid collectionId, IPublicationService service, ICurrentUserService user, CancellationToken ct) =>
            Results.Ok(await service.UnpublishAsync(user.GetCurrentUser(), collectionId, ct))).Produces<PublicationStatus>();
        var visitors = app.MapGroup("/showcases").AllowAnonymous().RequireRateLimiting("publication-reads");
        visitors.AddEndpointFilter(new BoundaryFilter(true));
        visitors.MapMethods("/{slug}", ["GET", "HEAD"], async (string slug, IPublicationService service, CancellationToken ct) =>
            Results.Ok(await service.PublicAsync(slug, null, ct))).Produces<PublicShowcase>();
        visitors.MapMethods("/{slug}/revisions/{revision:guid}", ["GET", "HEAD"], async (string slug, Guid revision, IPublicationService service, CancellationToken ct) =>
            Results.Ok(await service.PublicAsync(slug, revision, ct))).Produces<PublicShowcase>();
        visitors.MapMethods("/{slug}/media/{revision:guid}/{asset:guid}", ["GET", "HEAD"], async (string slug, Guid revision, Guid asset, IPublicationService service, CancellationToken ct) =>
            Image(await service.PublicImageAsync(slug, revision, asset, ct))).Produces(200, contentType: "image/jpeg");
        return app;
    }
    private static IResult Image(PublicationImage image) => Results.File(image.Bytes, image.ContentType, enableRangeProcessing: false);
    private sealed class BoundaryFilter(bool anonymous) : IEndpointFilter
    {
        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            if (!context.HttpContext.RequestServices.GetRequiredService<IConfiguration>().GetValue<bool>("Publication:Enabled"))
                return Results.Json(new { code = "showcase_unavailable" }, statusCode: anonymous ? 404 : 503);
            try { return await next(context); }
            catch (NotFoundException) { return Results.Json(new { code = "not_found" }, statusCode: 404); }
            catch (PublicationConflictException error) { return Results.Json(new { code = "review_again", message = error.Message }, statusCode: 409); }
            catch (ArgumentException error) when (!anonymous) { return Results.Json(new { code = "invalid_request", message = error.Message }, statusCode: 400); }
            catch (PublicationMediaException) { return Results.Json(new { code = "image_unavailable", message = "Retry or prepare a review without images." }, statusCode: 422); }
            catch (Exception) { return Results.Json(new { code = "showcase_unavailable" }, statusCode: 503); }
        }
    }
}
