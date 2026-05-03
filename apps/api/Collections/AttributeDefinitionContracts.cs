using CurateDS.Domain.Collections;

namespace CurateDS.Api.Collections;

public sealed record CreateAttributeDefinitionRequest(
    string Name,
    AttributeDataType DataType,
    bool IsRequired,
    bool IsFilterable,
    Guid? ItemTypeId = null);

public sealed record AttributeDefinitionResponse(
    Guid Id,
    Guid CollectionId,
    string Name,
    string Key,
    AttributeDataType DataType,
    bool IsRequired,
    bool IsFilterable,
    int SortOrder,
    Guid? ItemTypeId,
    DateTime CreatedUtc);
