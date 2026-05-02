using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ListSavedViews;

public sealed class ListSavedViewsService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly ISavedViewRepository _savedViewRepository;

    public ListSavedViewsService(
        ICollectionRepository collectionRepository,
        ISavedViewRepository savedViewRepository)
    {
        _collectionRepository = collectionRepository;
        _savedViewRepository = savedViewRepository;
    }

    public async Task<IReadOnlyList<SavedViewDto>> ExecuteAsync(
        ListSavedViewsQuery query,
        CancellationToken cancellationToken)
    {
        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            query.CollectionId, query.OwnerId, cancellationToken);

        if (collection is null)
            throw new NotFoundException("Collection was not found.");

        var views = await _savedViewRepository.ListByCollectionAsync(
            query.CollectionId, query.OwnerId, cancellationToken);

        return views
            .Select(v => new SavedViewDto(v.Id, v.CollectionId, v.Name, v.FiltersJson, v.CreatedUtc))
            .ToList();
    }
}
