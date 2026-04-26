namespace CurateDS.Application.Collections.DeleteLocation;

public sealed record DeleteLocationCommand(Guid OwnerId, Guid LocationId);
