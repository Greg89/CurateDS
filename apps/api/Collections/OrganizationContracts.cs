namespace CurateDS.Api.Collections;

public sealed record CreateTagRequest(string Name);

public sealed record TagResponse(Guid Id, string Name, string Key, DateTime CreatedUtc);

public sealed record CreateLocationRequest(string Name, string? Description);

public sealed record LocationResponse(Guid Id, string Name, string? Description, DateTime CreatedUtc);
