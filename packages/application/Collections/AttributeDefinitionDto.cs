using CurateDS.Domain.Collections;

namespace CurateDS.Application.Collections;

public sealed record AttributeDefinitionDto(
    Guid Id,
    Guid CollectionId,
    string Name,
    string Key,
    AttributeDataType DataType,
    bool IsRequired,
    bool IsFilterable,
    int SortOrder,
    DateTime CreatedUtc);
