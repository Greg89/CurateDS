namespace CurateDS.Application.Collections.UpdateLocation;

public sealed record UpdateLocationResult(
    Guid Id,
    string Name,
    string? Description,
    DateTime CreatedUtc,
    DateTime? UpdatedUtc);
