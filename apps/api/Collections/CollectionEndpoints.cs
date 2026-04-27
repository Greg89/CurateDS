using CurateDS.Api.ApiContracts;
using CurateDS.Application.Collections;
using CurateDS.Application.Collections.CreateAttributeDefinition;
using CurateDS.Application.Collections.CreateCollection;
using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.CreateLocation;
using CurateDS.Application.Collections.CreateTag;
using CurateDS.Application.Collections.DeleteCollection;
using CurateDS.Application.Collections.DeleteItem;
using CurateDS.Application.Collections.DeleteTag;
using CurateDS.Application.Collections.DeleteLocation;
using CurateDS.Application.Collections.DeleteAttributeDefinition;
using CurateDS.Application.Collections.GetItemDetail;
using CurateDS.Application.Collections.ListAttributeDefinitions;
using CurateDS.Application.Collections.ListCollections;
using CurateDS.Application.Collections.ListItemEvents;
using CurateDS.Application.Collections.ListItems;
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            var ownerId = GetDefaultOwnerId(configuration);
            var collections = await service.ExecuteAsync(new ListCollectionsQuery(ownerId), cancellationToken);

            return Results.Ok(collections.Select(ToResponse));
        });

        group.MapPost("/", async (
            CreateCollectionRequest request,
            CreateCollectionService service,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
                await service.ExecuteAsync(
                    new DeleteCollectionCommand(ownerId, collectionId),
                    cancellationToken);

                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return Results.NotFound();
            }
        });

        app.MapGet("/tags", async (
            ListTagsService service,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            var ownerId = GetDefaultOwnerId(configuration);
            var tags = await service.ExecuteAsync(new ListTagsQuery(ownerId), cancellationToken);
            return Results.Ok(tags.Select(tag => new TagResponse(tag.Id, tag.Name, tag.Key, tag.CreatedUtc)));
        }).RequireAuthorization();

        app.MapPost("/tags", async (
            CreateTagRequest request,
            CreateTagService service,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            var ownerId = GetDefaultOwnerId(configuration);
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            var ownerId = GetDefaultOwnerId(configuration);
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            var ownerId = GetDefaultOwnerId(configuration);
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
                var result = await service.ExecuteAsync(
                    new CreateAttributeDefinitionCommand(
                        ownerId,
                        collectionId,
                        request.Name,
                        request.DataType,
                        request.IsRequired,
                        request.IsFilterable),
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            var ownerId = GetDefaultOwnerId(configuration);
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

        group.MapGet("/{collectionId:guid}/items", async (
            Guid collectionId,
            [AsParameters] ListItemsRequest request,
            ListItemsService service,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
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
                        request.PageSize ?? 50),
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
                var result = await service.ExecuteAsync(
                    new CreateItemCommand(
                        ownerId,
                        collectionId,
                        request.Name,
                        request.Description,
                        request.Quantity,
                        request.LocationId,
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
                var result = await service.ExecuteAsync(
                    new UpdateItemCommand(
                        ownerId,
                        collectionId,
                        itemId,
                        request.Name,
                        request.Description,
                        request.Quantity,
                        request.LocationId,
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
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var ownerId = GetDefaultOwnerId(configuration);
                await service.ExecuteAsync(
                    new DeleteItemCommand(ownerId, collectionId, itemId),
                    cancellationToken);

                return Results.NoContent();
            }
            catch (NotFoundException)
            {
                return Results.NotFound();
            }
        });

        return app;
    }

    private static Guid GetDefaultOwnerId(IConfiguration configuration)
    {
        var value = configuration["AppDefaults:DefaultOwnerId"];

        if (!Guid.TryParse(value, out var ownerId))
        {
            throw new InvalidOperationException("AppDefaults:DefaultOwnerId must be configured.");
        }

        return ownerId;
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
