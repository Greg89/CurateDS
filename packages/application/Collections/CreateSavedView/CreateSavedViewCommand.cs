namespace CurateDS.Application.Collections.CreateSavedView;

public sealed record CreateSavedViewCommand(string OwnerId, Guid CollectionId, string Name, string FiltersJson);
