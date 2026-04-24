namespace CurateDS.Application.Collections.CreateTag;

public sealed record CreateTagCommand(Guid OwnerId, string Name);
