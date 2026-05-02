namespace CurateDS.Application.Collections.DeleteSavedView;

public sealed record DeleteSavedViewCommand(Guid OwnerId, Guid CollectionId, Guid SavedViewId);
