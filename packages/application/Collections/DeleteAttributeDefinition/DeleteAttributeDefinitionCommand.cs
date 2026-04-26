namespace CurateDS.Application.Collections.DeleteAttributeDefinition;

public sealed record DeleteAttributeDefinitionCommand(Guid OwnerId, Guid CollectionId, Guid AttributeDefinitionId);
