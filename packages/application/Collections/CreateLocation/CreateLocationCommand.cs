namespace CurateDS.Application.Collections.CreateLocation;

public sealed record CreateLocationCommand(string OwnerId, string Name, string? Description);
