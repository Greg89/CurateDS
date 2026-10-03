namespace CurateDS.Application.Collections.CreateCollection;

public sealed record CreateCollectionResult(Guid Id, string Name, DateTime CreatedUtc,
    string? Category = null, string? Description = null, string? CoverImageUrl = null, string? Color = null);
