using CurateDS.Domain.Collections;

namespace CurateDS.Application.Collections.UpdateAttributeDefinition;

public sealed record UpdateAttributeDefinitionResult(
    Guid Id,
    Guid CollectionId,
    string Name,
    string Key,
    AttributeDataType DataType,
    bool IsRequired,
    bool IsFilterable,
    int SortOrder,
    Guid? ItemTypeId,
    DateTime CreatedUtc,
    DateTime? UpdatedUtc);
