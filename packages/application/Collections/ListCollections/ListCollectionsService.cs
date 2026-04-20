using CurateDS.Application.Abstractions.Persistence;

namespace CurateDS.Application.Collections.ListCollections;

public sealed class ListCollectionsService
{
    private readonly ICollectionRepository _collectionRepository;

    public ListCollectionsService(ICollectionRepository collectionRepository)
    {
        _collectionRepository = collectionRepository;
    }

    public async Task<IReadOnlyList<CollectionDto>> ExecuteAsync(
        ListCollectionsQuery query,
        CancellationToken cancellationToken)
    {
        var collections = await _collectionRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);

        return collections
            .Select(collection => new CollectionDto(collection.Id, collection.Name, collection.CreatedUtc))
            .ToArray();
    }
}
