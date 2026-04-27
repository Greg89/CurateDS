namespace CurateDS.Application.Collections.ListItemEvents;

public sealed record ListItemEventsQuery(Guid OwnerId, Guid CollectionId, Guid ItemId);
