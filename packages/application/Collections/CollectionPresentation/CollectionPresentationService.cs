using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.CollectionPresentation;

public sealed class CollectionPresentationService(ICollectionRepository collections,
    ICollectionPresentationRepository presentation, ICatalogUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    IValidator<UpdateCollectionPresentationCommand> validator)
{
    public async Task<CollectionPresentationDto> GetAsync(string ownerId, Guid collectionId, CancellationToken ct)
    {
        var collection = await FindAsync(ownerId, collectionId, ct);
        var items = await presentation.GetItemsAsync(collectionId, collection.PinnedItemIds, ct);
        return Map(collection, items);
    }

    public async Task<CollectionPresentationDto> UpdateAsync(UpdateCollectionPresentationCommand command, CancellationToken ct)
    {
        await validator.ValidateAndThrowAsync(command, ct);
        var collection = await FindAsync(command.OwnerId, command.CollectionId, ct);
        return await unitOfWork.ExecuteInTransactionAsync(async innerCt =>
        {
            var items = await presentation.GetItemsAsync(collection.Id, command.PinnedItemIds, innerCt);
            if (items.Count != command.PinnedItemIds.Count)
                throw new ValidationException([new ValidationFailure("PinnedItemIds",
                    "One or more selected items are no longer in this collection.")]);
            collection.UpdatePresentation(command.ShowCover, command.ShowSummary, command.ShowPinnedItems,
                command.ShowRecentItems, command.PinnedItemIds, DateTime.UtcNow, currentUser.GetCurrentUser());
            return Map(collection, items);
        }, ct);
    }

    private async Task<Collection> FindAsync(string ownerId, Guid id, CancellationToken ct) =>
        await collections.GetByIdAndOwnerAsync(id, ownerId, ct) ?? throw new NotFoundException("Collection was not found.");

    private CollectionPresentationDto Map(Collection collection, IReadOnlyList<PinnedItemProjection> items)
    {
        var lookup = items.ToDictionary(item => item.Id);
        var pins = collection.PinnedItemIds.Where(lookup.ContainsKey).Select(id =>
        {
            var item = lookup[id];
            return new PinnedItemDto(item.Id, item.CollectionId, item.Name, item.Description, item.CreatedUtc,
                item.PrimaryImageAssetId is null ? null : MediaContentPath.For(item.CollectionId, item.Id, item.PrimaryImageAssetId.Value));
        }).ToArray();
        return new(collection.Id, collection.ShowCover, collection.ShowSummary,
            collection.ShowPinnedItems, collection.ShowRecentItems, pins);
    }
}
