namespace CurateDS.Application.Collections.DeleteCollection;

public sealed record DeleteCollectionCommand(Guid OwnerId, Guid CollectionId);
