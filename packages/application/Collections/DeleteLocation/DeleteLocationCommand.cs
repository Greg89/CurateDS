namespace CurateDS.Application.Collections.DeleteLocation;

public sealed record DeleteLocationCommand(string OwnerId, Guid LocationId);
