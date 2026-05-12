namespace CurateDS.Application.Collections.DeleteTag;

public sealed record DeleteTagCommand(string OwnerId, Guid TagId);
