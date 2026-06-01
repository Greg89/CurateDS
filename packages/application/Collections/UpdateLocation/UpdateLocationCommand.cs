namespace CurateDS.Application.Collections.UpdateLocation;

public sealed record UpdateLocationCommand(string OwnerId, Guid LocationId, string Name, string? Description);
