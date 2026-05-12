namespace CurateDS.Application.Collections.DeleteAttributeDefinition;

public sealed record DeleteAttributeDefinitionCommand(string OwnerId, Guid CollectionId, Guid AttributeDefinitionId);
