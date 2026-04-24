namespace CurateDS.Application.Collections;

public sealed record LocationDto(Guid Id, string Name, string? Description, DateTime CreatedUtc);
