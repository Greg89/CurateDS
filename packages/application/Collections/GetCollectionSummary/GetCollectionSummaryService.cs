using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.GetCollectionSummary;

public sealed class GetCollectionSummaryService
{
    private readonly ICollectionRepository _collectionRepository;

    public GetCollectionSummaryService(ICollectionRepository collectionRepository)
    {
        _collectionRepository = collectionRepository;
    }

    public async Task<CollectionSummaryDto> ExecuteAsync(
        GetCollectionSummaryQuery query,
        CancellationToken cancellationToken)
    {
        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            query.CollectionId,
            query.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        return await _collectionRepository.GetSummaryAsync(query.CollectionId, cancellationToken);
    }
}
