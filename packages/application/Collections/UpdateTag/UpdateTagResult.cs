namespace CurateDS.Application.Collections.UpdateTag;

public sealed record UpdateTagResult(Guid Id, string Name, string Key, DateTime CreatedUtc, DateTime? UpdatedUtc);
