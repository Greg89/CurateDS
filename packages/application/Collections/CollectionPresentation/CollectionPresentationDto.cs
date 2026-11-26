namespace CurateDS.Application.Collections.CollectionPresentation;

public sealed record CollectionPresentationDto(Guid CollectionId, bool ShowCover, bool ShowSummary,
    bool ShowPinnedItems, bool ShowRecentItems, IReadOnlyList<PinnedItemDto> PinnedItems);
public sealed record PinnedItemDto(Guid Id, Guid CollectionId, string Name, string? Description,
    DateTime CreatedUtc, string? PrimaryImageUrl);
public sealed record PinnedItemProjection(Guid Id, Guid CollectionId, string Name, string? Description,
    DateTime CreatedUtc, Guid? PrimaryImageAssetId);
public sealed record UpdateCollectionPresentationCommand(string OwnerId, Guid CollectionId, bool ShowCover,
    bool ShowSummary, bool ShowPinnedItems, bool ShowRecentItems, IReadOnlyList<Guid> PinnedItemIds);
