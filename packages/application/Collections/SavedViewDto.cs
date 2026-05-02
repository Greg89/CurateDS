namespace CurateDS.Application.Collections;

public sealed record SavedViewDto(Guid Id, Guid CollectionId, string Name, string FiltersJson, DateTime CreatedUtc);
