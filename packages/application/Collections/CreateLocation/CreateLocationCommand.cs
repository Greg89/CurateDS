namespace CurateDS.Application.Collections.CreateLocation;

public sealed record CreateLocationCommand(Guid OwnerId, string Name, string? Description);
