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
    DateTime UpdatedUtc);

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
    DateTime UpdatedUtc,
    IReadOnlyList<ItemAttributeValueResponse> AttributeValues);

public sealed record ItemAttributeValueResponse(
    Guid AttributeDefinitionId,
    string AttributeName,
    string AttributeKey,
    AttributeDataType DataType,
    string Value);
