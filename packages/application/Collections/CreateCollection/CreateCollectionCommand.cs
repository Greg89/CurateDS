namespace CurateDS.Application.Collections.CreateCollection;

public sealed record CreateCollectionCommand(string OwnerId, string Name,
    string? Category = null, string? Description = null, string? CoverImageUrl = null, string? Color = null);
