using CurateDS.Domain.Collections;

namespace CurateDS.Api.Collections;

public sealed record CreateItemRequest(
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    IReadOnlyList<Guid> TagIds,
    IReadOnlyList<CreateItemAttributeValueRequest> AttributeValues);

public sealed record UpdateItemRequest(
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    IReadOnlyList<Guid> TagIds,
    IReadOnlyList<CreateItemAttributeValueRequest> AttributeValues);

public sealed record CreateItemAttributeValueRequest(Guid AttributeDefinitionId, string Value);

public sealed record ItemSummaryResponse(
    Guid Id,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    string? LocationName,
    IReadOnlyList<string> Tags,
    int AttributeValueCount,
    DateTime CreatedUtc,
    DateTime? UpdatedUtc,  // null until a PUT action is taken
    string? PrimaryImageUrl);

public sealed record ItemDetailResponse(
    Guid Id,
    Guid CollectionId,
    string Name,
    string? Description,
    int Quantity,
    Guid? LocationId,
    string? LocationName,
    IReadOnlyList<TagResponse> Tags,
    DateTime CreatedUtc,
    DateTime? UpdatedUtc,  // null until a PUT action is taken
    IReadOnlyList<ItemAttributeValueResponse> AttributeValues,
    IReadOnlyList<MediaAssetResponse> MediaAssets);

public sealed record MediaAssetResponse(
    Guid Id,
    string Url,
    string ContentType,
    string FileName,
    long SizeBytes,
    bool IsPrimary,
    DateTime UploadedUtc);

public sealed record ItemAttributeValueResponse(
    Guid AttributeDefinitionId,
    string AttributeName,
    string AttributeKey,
    AttributeDataType DataType,
    string Value);

public sealed record PagedItemsResponse(
    IReadOnlyList<ItemSummaryResponse> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);

public sealed record ItemEventResponse(
    Guid Id,
    Guid ItemId,
    Guid CollectionId,
    string EventType,
    DateTime OccurredUtc,
    string OccurredBy,
    string? Notes);
