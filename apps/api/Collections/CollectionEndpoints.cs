using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateAttributeDefinition;
using CurateDS.Application.Collections.CreateCollection;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.CreateItemType;
using CurateDS.Application.Collections.CreateLocation;
using CurateDS.Application.Collections.CreateTag;
using CurateDS.Application.Collections.DeleteCollection;
using CurateDS.Application.Collections.DeleteItem;
using CurateDS.Application.Collections.DeleteItemType;
using CurateDS.Application.Collections.DeleteTag;
using CurateDS.Application.Collections.DeleteLocation;
using CurateDS.Application.Collections.DeleteAttributeDefinition;
using CurateDS.Application.Collections.CreateSavedView;
using CurateDS.Application.Collections.DeleteSavedView;
using CurateDS.Application.Collections.ExportCollection;
using CurateDS.Application.Collections.GetCollectionReports;
using CurateDS.Application.Collections.GetCollectionSummary;
using CurateDS.Application.Collections.GetItemDetail;
using CurateDS.Application.Collections.ListCollectionActivity;
using CurateDS.Application.Collections.ListSavedViews;
using CurateDS.Application.Collections.ListAttributeDefinitions;
using CurateDS.Application.Collections.ListCollections;
using CurateDS.Application.Collections.ListItemEvents;
using CurateDS.Application.Collections.ListItems;
using CurateDS.Application.Collections.ListItemTypes;
using CurateDS.Application.Collections.ListLocations;
using CurateDS.Application.Collections.ListTags;
using CurateDS.Application.Collections.UpdateItem;
using CurateDS.Application.Common;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Api.Collections;

public static class CollectionEndpoints
{
    public static IEndpointRouteBuilder MapCollectionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/collections").RequireAuthorization();

        group.MapGet("/", async (
            ListCollectionsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            var collections = await service.ExecuteAsync(new ListCollectionsQuery(ownerId), cancellationToken);

            return Results.Ok(collections.Select(ToResponse));
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

                return Results.Created($"/collections/{result.Id}", ToResponse(
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
            catch (DbUpdateException)
            {
                return ApiResponses.Conflict(
                    nameof(CreateTagRequest.Name),
                    "A tag with this name already exists.",
                    "duplicate_tag");
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

        group.MapGet("/{collectionId:guid}/attribute-definitions", async (
            Guid collectionId,
            ListAttributeDefinitionsService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var attributeDefinitions = await service.ExecuteAsync(
                    new ListAttributeDefinitionsQuery(ownerId, collectionId),
                    cancellationToken);

                return Results.Ok(attributeDefinitions.Select(ToResponse));
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Collection was not found.");
            }
        });

        group.MapPost("/{collectionId:guid}/attribute-definitions", async (
            Guid collectionId,
            CreateAttributeDefinitionRequest request,
            CreateAttributeDefinitionService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = currentUserService.GetCurrentUser();
                var result = await service.ExecuteAsync(
                    new CreateAttributeDefinitionCommand(
                        ownerId,
                        collectionId,
                        request.Name,
                        request.DataType,
                        request.IsRequired,
                        request.IsFilterable,
                        request.ItemTypeId),
                    cancellationToken);

                return Results.Created(
                    $"/collections/{collectionId}/attribute-definitions/{result.Id}",
                    ToResponse(new AttributeDefinitionDto(
                        result.Id,
                        result.CollectionId,
                        result.Name,
                        result.Key,
                        result.DataType,
                        result.IsRequired,
                        result.IsFilterable,
                        result.SortOrder,
                        result.ItemTypeId,
                        result.CreatedUtc)));
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

        group.MapDelete("/{collectionId:guid}/attribute-definitions/{attributeDefinitionId:guid}", async (
            Guid collectionId,
            Guid attributeDefinitionId,
            DeleteAttributeDefinitionService service,
            ICurrentUserService currentUserService,
            CancellationToken cancellationToken) =>
        {
            var ownerId = currentUserService.GetCurrentUser();
            try
            {
                await service.ExecuteAsync(
                    new DeleteAttributeDefinitionCommand(ownerId, collectionId, attributeDefinitionId),
                    cancellationToken);
                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return ApiResponses.NotFound("Attribute definition was not found.");
            }
        }).RequireAuthorization();

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
                        ParseAttributeFilters(request.AttributeFilters),
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
                        ItemTypeId: request.ItemTypeId),
                    cancellationToken);

                return Results.Ok(new PagedItemsResponse(
                    result.Items.Select(ToResponse).ToArray(),
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
                            new CreateItemAttributeValueInput(
                                attributeValue.AttributeDefinitionId,
                                attributeValue.Value)).ToArray()),
                    cancellationToken);

                return Results.Created(
                    $"/collections/{collectionId}/items/{result.Id}",
                    ToResponse(new ItemDetailDto(
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

                return Results.Ok(ToResponse(item));
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
                            new CreateItemAttributeValueInput(
                                attributeValue.AttributeDefinitionId,
                                attributeValue.Value)).ToArray()),
                    cancellationToken);

                return Results.Ok(ToResponse(new ItemDetailDto(
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

    private static CollectionResponse ToResponse(CollectionDto collection) =>
        new(collection.Id, collection.Name, collection.CreatedUtc);

    private static AttributeDefinitionResponse ToResponse(AttributeDefinitionDto attributeDefinition) =>
        new(
            attributeDefinition.Id,
            attributeDefinition.CollectionId,
            attributeDefinition.Name,
            attributeDefinition.Key,
            attributeDefinition.DataType,
            attributeDefinition.IsRequired,
            attributeDefinition.IsFilterable,
            attributeDefinition.SortOrder,
            attributeDefinition.ItemTypeId,
            attributeDefinition.CreatedUtc);

    private static ItemSummaryResponse ToResponse(ItemSummaryDto item) =>
        new(
            item.Id,
            item.CollectionId,
            item.Name,
            item.Description,
            item.Quantity,
            item.LocationId,
            item.LocationName,
            item.Tags,
            item.AttributeValueCount,
            item.CreatedUtc,
            item.UpdatedUtc,
            item.PrimaryImageUrl);

    private static ItemDetailResponse ToResponse(ItemDetailDto item) =>
        new(
            item.Id,
            item.CollectionId,
            item.Name,
            item.Description,
            item.Quantity,
            item.LocationId,
            item.LocationName,
            item.ItemTypeId,
            item.Tags.Select(tag => new TagResponse(tag.Id, tag.Name, tag.Key, tag.CreatedUtc)).ToArray(),
            item.CreatedUtc,
            item.UpdatedUtc,
            item.AttributeValues.Select(attributeValue => new ItemAttributeValueResponse(
                attributeValue.AttributeDefinitionId,
                attributeValue.AttributeName,
                attributeValue.AttributeKey,
                attributeValue.DataType,
                attributeValue.Value)).ToArray(),
            item.MediaAssets.Select(a => new MediaAssetResponse(
                a.Id,
                a.Url,
                a.ContentType,
                a.FileName,
                a.SizeBytes,
                a.IsPrimary,
                a.UploadedUtc)).ToArray());

    private static IReadOnlyList<ListItemsAttributeFilter> ParseAttributeFilters(string[]? attributeFilters)
    {
        if (attributeFilters is null || attributeFilters.Length == 0)
        {
            return [];
        }

        return attributeFilters
            .Select(ParseAttributeFilter)
            .Where(filter => filter is not null)
            .Cast<ListItemsAttributeFilter>()
            .ToArray();
    }

    private static ListItemsAttributeFilter? ParseAttributeFilter(string attributeFilter)
    {
        if (string.IsNullOrWhiteSpace(attributeFilter))
        {
            return null;
        }

        var separatorIndex = attributeFilter.IndexOf('=');

        if (separatorIndex <= 0 || separatorIndex >= attributeFilter.Length - 1)
        {
            return null;
        }

        var attributeKey = attributeFilter[..separatorIndex].Trim();
        var value = attributeFilter[(separatorIndex + 1)..].Trim();

        return string.IsNullOrWhiteSpace(attributeKey) || string.IsNullOrWhiteSpace(value)
            ? null
            : new ListItemsAttributeFilter(attributeKey, value);
    }
}
