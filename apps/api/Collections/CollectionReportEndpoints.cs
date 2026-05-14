using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.ExportCollection;
using CurateDS.Application.Collections.GetCollectionReports;
using CurateDS.Application.Collections.GetCollectionSummary;
using CurateDS.Application.Collections.ListCollectionActivity;
using CurateDS.Application.Common;

namespace CurateDS.Api.Collections;

public static class CollectionReportEndpoints
{
    public static IEndpointRouteBuilder MapCollectionReportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections").RequireAuthorization();

        group.MapGet("/{collectionId:guid}/summary", async (
            Guid collectionId,
            GetCollectionSummaryService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var summary = await service.ExecuteAsync(
                    new GetCollectionSummaryQuery(ownerId, collectionId),
                    cancellationToken);

                return Results.Ok(new CollectionSummaryResponse(
                    summary.CollectionId,
                    summary.TotalItems,
                    summary.TotalAttributeDefinitions,
                    summary.TagsUsed,
                    summary.LocationsUsed,
                    summary.ItemsWithNoLocation,
                    summary.ItemsWithNoTags,
                    summary.TotalMediaAssets));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        });

        group.MapGet("/{collectionId:guid}/reports", async (
            Guid collectionId,
            GetCollectionReportsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var reports = await service.ExecuteAsync(
                    new GetCollectionReportsQuery(ownerId, collectionId),
                    cancellationToken);

                return Results.Ok(new CollectionReportsResponse(
                    reports.ItemsByLocation.Select(x => new ItemsByLocationResponse(x.LocationId, x.LocationName, x.Count)).ToArray(),
                    reports.ItemsByTag.Select(x => new ItemsByTagResponse(x.TagId, x.TagName, x.Count)).ToArray()));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        });

        group.MapGet("/{collectionId:guid}/activity", async (
            Guid collectionId,
            int page,
            int pageSize,
            ListCollectionActivityService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new ListCollectionActivityQuery(ownerId, collectionId, page, pageSize),
                    cancellationToken);

                return Results.Ok(new PagedCollectionActivityResponse(
                    result.Items.Select(e => new CollectionActivityEventResponse(
                        e.EventId, e.ItemId, e.ItemName, e.EventType, e.OccurredUtc, e.OccurredBy, e.Notes)).ToArray(),
                    result.TotalCount,
                    result.Page,
                    result.PageSize,
                    result.TotalPages));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        });

        group.MapGet("/{collectionId:guid}/export", async (
            Guid collectionId,
            ExportCollectionService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new ExportCollectionQuery(ownerId, collectionId),
                    cancellationToken);

                return Results.File(result.ZipBytes, "application/zip", result.FileName);
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        });

        return app;
    }
}
