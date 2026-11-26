using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.UpdateCollection;

public sealed class UpdateCollectionVocabularyService(
    ICollectionRepository collections, ICatalogUnitOfWork unitOfWork, ICurrentUserService user)
{
    public async Task<CollectionDto> ExecuteAsync(string ownerId, Guid collectionId,
        string itemLabel, string itemsLabel, CancellationToken ct)
    {
        var collection = await collections.GetByIdAndOwnerAsync(collectionId, ownerId, ct)
            ?? throw new NotFoundException("Collection was not found.");
        if (!Collection.IsValidItemLabel(itemLabel) || !Collection.IsValidItemLabel(itemsLabel))
            throw new ValidationException([new ValidationFailure("Labels", "Use labels between 1 and 40 characters without line breaks.")]);

        return await unitOfWork.ExecuteInTransactionAsync(_ =>
        {
            collection.UpdateVocabulary(itemLabel, itemsLabel, DateTime.UtcNow, user.GetCurrentUser());
            return Task.FromResult(new CollectionDto(collection.Id, collection.Name, collection.CreatedUtc,
                collection.Category, collection.Description, collection.CoverImageUrl, collection.Color,
                collection.ItemLabel, collection.ItemsLabel));
        }, ct);
    }
}
