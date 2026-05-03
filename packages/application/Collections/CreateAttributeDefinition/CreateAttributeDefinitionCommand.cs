using CurateDS.Domain.Collections;

namespace CurateDS.Application.Collections.CreateAttributeDefinition;

public sealed record CreateAttributeDefinitionCommand(
    Guid OwnerId,
    Guid CollectionId,
    string Name,
    AttributeDataType DataType,
    bool IsRequired,
    bool IsFilterable,
    Guid? ItemTypeId = null);
