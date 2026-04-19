namespace CurateDS.Application.Collections.CreateCollection;

public sealed record CreateCollectionCommand(Guid OwnerId, string Name);
