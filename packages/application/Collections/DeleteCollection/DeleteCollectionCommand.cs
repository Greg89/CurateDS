namespace CurateDS.Application.Collections.DeleteCollection;

public sealed record DeleteCollectionCommand(string OwnerId, Guid CollectionId);
