namespace CurateDS.Application.Collections.CreateSavedView;

public sealed record CreateSavedViewCommand(Guid OwnerId, Guid CollectionId, string Name, string FiltersJson);
