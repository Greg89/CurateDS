using CurateDS.Domain.Collections;

namespace CurateDS.Application.Collections.CreateAttributeDefinition;

public sealed record CreateAttributeDefinitionResult(
    Guid Id,
    Guid CollectionId,
    string Name,
    string Key,
    AttributeDataType DataType,
    bool IsRequired,
    bool IsFilterable,
    int SortOrder,
    DateTime CreatedUtc);
