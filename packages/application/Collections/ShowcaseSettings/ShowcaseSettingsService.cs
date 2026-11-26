using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.ShowcaseSettings;

public sealed record ShowcaseSettingsDto(Guid CollectionId, string Layout, bool ShowGrowth, bool ShowTypes);

public sealed class ShowcaseSettingsService(
    ICollectionRepository collections, ICatalogUnitOfWork unitOfWork, ICurrentUserService user)
{
    public async Task<ShowcaseSettingsDto> GetAsync(string ownerId, Guid collectionId, CancellationToken ct) =>
        Map(await Find(ownerId, collectionId, ct));

    public async Task<ShowcaseSettingsDto> UpdateAsync(string ownerId, Guid collectionId,
        string layout, bool showGrowth, bool showTypes, CancellationToken ct)
    {
        var collection = await Find(ownerId, collectionId, ct);
        if (!Collection.IsValidShowcaseLayout(layout))
            throw new ValidationException([new ValidationFailure("Layout", "Choose Gallery or Journal.")]);
        return await unitOfWork.ExecuteInTransactionAsync(_ =>
        {
            collection.UpdateShowcaseSettings(layout, showGrowth, showTypes, DateTime.UtcNow, user.GetCurrentUser());
            return Task.FromResult(Map(collection));
        }, ct);
    }

    private async Task<Collection> Find(string ownerId, Guid collectionId, CancellationToken ct) =>
        await collections.GetByIdAndOwnerAsync(collectionId, ownerId, ct)
            ?? throw new NotFoundException("Collection was not found.");

    private static ShowcaseSettingsDto Map(Collection collection) => new(collection.Id,
        collection.ShowcaseLayout, collection.ShowcaseShowGrowth, collection.ShowcaseShowTypes);
}
