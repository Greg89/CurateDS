namespace CurateDS.Application.Collections.DeleteTag;

public sealed record DeleteTagCommand(Guid OwnerId, Guid TagId);
