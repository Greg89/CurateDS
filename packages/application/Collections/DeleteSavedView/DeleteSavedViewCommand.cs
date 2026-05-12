namespace CurateDS.Application.Collections.DeleteSavedView;

public sealed record DeleteSavedViewCommand(string OwnerId, Guid CollectionId, Guid SavedViewId);
