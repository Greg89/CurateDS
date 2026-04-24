using CurateDS.Domain.Collections;

namespace CurateDS.Application.Collections;

public sealed record ItemAttributeValueDto(
    Guid AttributeDefinitionId,
    string AttributeName,
    string AttributeKey,
    AttributeDataType DataType,
    string Value);
