namespace CurateDS.Application.Collections.CreateLocation;

public sealed record CreateLocationResult(Guid Id, string Name, string? Description, DateTime CreatedUtc);
