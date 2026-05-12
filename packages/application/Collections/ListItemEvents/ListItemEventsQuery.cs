namespace CurateDS.Application.Collections.ListItemEvents;

public sealed record ListItemEventsQuery(string OwnerId, Guid CollectionId, Guid ItemId);
