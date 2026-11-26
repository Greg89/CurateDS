using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.DeleteItemMedia;
using CurateDS.Application.Collections.SetPrimaryItemMedia;
using CurateDS.Application.Collections.UploadItemMedia;
using CurateDS.Application.Common;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace CurateDS.Api.Collections;

public static class MediaEndpoints
{
    public static IEndpointRouteBuilder MapMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections/{collectionId:guid}/items/{itemId:guid}/media")
            .RequireAuthorization()
            .DisableAntiforgery();

        group.MapGet("/{mediaAssetId:guid}/content", async (Guid collectionId, Guid itemId, Guid mediaAssetId,
            CurateDS.Application.Collections.ReadItemMedia.ReadItemMediaService service,
            ICurrentUserService user, CancellationToken ct) =>
        {
            try
            {
                var content = await service.ExecuteAsync(user.GetCurrentUser(), collectionId, itemId, mediaAssetId, ct);
                return Results.File(content.Bytes, content.ContentType, enableRangeProcessing: false);
            }
            catch (NotFoundException) { return ApiResponses.NotFound("Media asset was not found."); }
            catch (Exception error) when (error is IOException or InvalidDataException) { return Results.Problem(statusCode: 502, detail: "Media is temporarily unavailable."); }
        }).Produces(StatusCodes.Status200OK, contentType: "image/png", additionalContentTypes: ["image/jpeg", "image/webp", "image/gif"]);

        group.MapPost("/", async (
            Guid collectionId,
            Guid itemId,
            IFormFile file,
            UploadItemMediaService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                await using var stream = file.OpenReadStream();
                var command = new UploadItemMediaCommand(
                    ownerId,
                    collectionId,
                    itemId,
                    stream,
                    file.ContentType,
                    file.FileName,
                    file.Length);

                var asset = await service.ExecuteAsync(command, cancellationToken);
                return Results.Created(
                    $"/collections/{collectionId}/items/{itemId}/media/{asset.Id}",
                    asset);
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Item or collection was not found.");
            }
            catch (ValidationException ex)
            {
                return ApiResponses.Validation(ex);
            }
        }).Produces<CurateDS.Application.Collections.MediaAssetDto>(StatusCodes.Status201Created);

        group.MapDelete("/{mediaAssetId:guid}", async (
            Guid collectionId,
            Guid itemId,
            Guid mediaAssetId,
            DeleteItemMediaService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                await service.ExecuteAsync(
                    new DeleteItemMediaCommand(ownerId, collectionId, itemId, mediaAssetId),
                    cancellationToken);
                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Media asset was not found.");
            }
        });

        group.MapPut("/{mediaAssetId:guid}/primary", async (
            Guid collectionId,
            Guid itemId,
            Guid mediaAssetId,
            SetPrimaryItemMediaService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                await service.ExecuteAsync(
                    new SetPrimaryItemMediaCommand(ownerId, collectionId, itemId, mediaAssetId),
                    cancellationToken);
                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Media asset was not found.");
            }
        });

        return app;
    }

}

