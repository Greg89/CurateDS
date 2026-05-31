using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.DeleteItem;
using CurateDS.Application.Collections.GetItemDetail;
using CurateDS.Application.Collections.ListItemEvents;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Collections.Shared;
using CurateDS.Application.Collections.UpdateItem;
using CurateDS.Application.Common;
using FluentValidation;

namespace CurateDS.Api.Collections;

public static class ItemEndpoints
{
    public static IEndpointRouteBuilder MapItemEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections").RequireAuthorization();

        group.MapGet("/{collectionId:guid}/items", async (
            Guid collectionId,
            [AsParameters] ListItemsRequest request,
            ListItemsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new ListItemsQuery(
                        ownerId,
                        collectionId,
                        request.SearchText,
                        request.LocationId,
                        request.TagIds ?? [],
                        CollectionResponseMappers.ParseAttributeFilters(request.AttributeFilters),
                        request.SortBy,
                        request.SortDirection,
                        request.Page ?? 1,
                        request.PageSize ?? 50,
                        MinQuantity: request.MinQuantity,
                        MaxQuantity: request.MaxQuantity,
                        CreatedAfter: request.CreatedAfter,
                        CreatedBefore: request.CreatedBefore,
                        HasNoLocation: request.HasNoLocation ?? false,
                        HasNoTags: request.HasNoTags ?? false,
                        ItemTypeId: request.ItemTypeId,
                        TagMatchMode: string.Equals(request.TagMatchMode, "any", StringComparison.OrdinalIgnoreCase)
                            ? TagMatchMode.Any
                            : TagMatchMode.All),
                    cancellationToken);

                return Results.Ok(new PagedItemsResponse(
                    result.Items.Select(CollectionResponseMappers.ToItemSummaryResponse).ToArray(),
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

        group.MapPost("/{collectionId:guid}/items", async (
            Guid collectionId,
            CreateItemRequest request,
            CreateItemService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new CreateItemCommand(
                        ownerId,
                        collectionId,
                        request.Name,
                        request.Description,
                        request.Quantity,
                        request.LocationId,
                        request.ItemTypeId,
                        request.TagIds ?? [],
                        (request.AttributeValues ?? []).Select(attributeValue =>
                            new AttributeValueInput(
                                attributeValue.AttributeDefinitionId,
                                attributeValue.Value)).ToArray()),
                    cancellationToken);

                return Results.Created(
                    $"/collections/{collectionId}/items/{result.Id}",
                    CollectionResponseMappers.ToItemDetailResponse(new ItemDetailDto(
                        result.Id,
                        result.CollectionId,
                        result.Name,
                        result.Description,
                        result.Quantity,
                        result.LocationId,
                        result.LocationName,
                        result.ItemTypeId,
                        result.Tags,
                        result.CreatedUtc,
                        result.UpdatedUtc,
                        result.AttributeValues,
                        [])));
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

        group.MapGet("/{collectionId:guid}/items/{itemId:guid}", async (
            Guid collectionId,
            Guid itemId,
            GetItemDetailService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var item = await service.ExecuteAsync(
                    new GetItemDetailQuery(ownerId, collectionId, itemId),
                    cancellationToken);

                return Results.Ok(CollectionResponseMappers.ToItemDetailResponse(item));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Item was not found.");
            }
        });

        group.MapGet("/{collectionId:guid}/items/{itemId:guid}/events", async (
            Guid collectionId,
            Guid itemId,
            ListItemEventsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var events = await service.ExecuteAsync(
                    new ListItemEventsQuery(ownerId, collectionId, itemId),
                    cancellationToken);

                return Results.Ok(events.Select(e => new ItemEventResponse(
                    e.Id,
                    e.ItemId,
                    e.CollectionId,
                    e.EventType.ToString(),
                    e.OccurredUtc,
                    e.OccurredBy,
                    e.Notes)));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Item or collection was not found.");
            }
        });

        group.MapPut("/{collectionId:guid}/items/{itemId:guid}", async (
            Guid collectionId,
            Guid itemId,
            UpdateItemRequest request,
            UpdateItemService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new UpdateItemCommand(
                        ownerId,
                        collectionId,
                        itemId,
                        request.Name,
                        request.Description,
                        request.Quantity,
                        request.LocationId,
                        request.ItemTypeId,
                        request.TagIds ?? [],
                        (request.AttributeValues ?? []).Select(attributeValue =>
                            new AttributeValueInput(
                                attributeValue.AttributeDefinitionId,
                                attributeValue.Value)).ToArray()),
                    cancellationToken);

                return Results.Ok(CollectionResponseMappers.ToItemDetailResponse(new ItemDetailDto(
                    result.Id,
                    result.CollectionId,
                    result.Name,
                    result.Description,
                    result.Quantity,
                    result.LocationId,
                    result.LocationName,
                    result.ItemTypeId,
                    result.Tags,
                    result.CreatedUtc,
                    result.UpdatedUtc,
                    result.AttributeValues,
                    [])));
            }
            catch (ValidationException exception)
            {
                return ApiResponses.Validation(exception);
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Item or collection was not found.");
            }
        });

        group.MapDelete("/{collectionId:guid}/items/{itemId:guid}", async (
            Guid collectionId,
            Guid itemId,
            DeleteItemService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                await service.ExecuteAsync(
                    new DeleteItemCommand(ownerId, collectionId, itemId),
                    cancellationToken);

                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Item was not found.");
            }
        });

        return app;
    }
}
