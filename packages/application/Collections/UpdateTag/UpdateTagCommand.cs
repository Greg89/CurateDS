namespace CurateDS.Application.Collections.UpdateTag;

public sealed record UpdateTagCommand(string OwnerId, Guid TagId, string Name);
