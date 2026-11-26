using CurateDS.Application.Collections.Shared;

namespace CurateDS.Application.Collections.UpdateCollection;

public sealed record UpdateCollectionCommand(string OwnerId, Guid CollectionId, string Name,
    string? Category = null, string? Description = null, string? CoverImageUrl = null, string? Color = null)
    : ICollectionIdentityCommand;
