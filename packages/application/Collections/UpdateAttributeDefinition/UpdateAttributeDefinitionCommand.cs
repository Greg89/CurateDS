namespace CurateDS.Application.Collections.UpdateAttributeDefinition;

public sealed record UpdateAttributeDefinitionCommand(
    string OwnerId,
    Guid CollectionId,
    Guid AttributeDefinitionId,
    string Name,
    bool IsRequired,
    bool IsFilterable,
    Guid? ItemTypeId);
