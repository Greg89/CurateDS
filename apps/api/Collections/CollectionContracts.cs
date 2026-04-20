namespace CurateDS.Api.Collections;

public sealed record CreateCollectionRequest(string Name);

public sealed record CollectionResponse(Guid Id, string Name, DateTime CreatedUtc);
