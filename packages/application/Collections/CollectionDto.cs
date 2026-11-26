namespace CurateDS.Application.Collections;

public sealed record CollectionDto(Guid Id, string Name, DateTime CreatedUtc,
    string? Category = null, string? Description = null, string? CoverImageUrl = null, string? Color = null, string ItemLabel = "item", string ItemsLabel = "items");
