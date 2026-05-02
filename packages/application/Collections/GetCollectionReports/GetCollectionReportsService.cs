using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.GetCollectionReports;

public sealed class GetCollectionReportsService
{
    private readonly ICollectionRepository _collectionRepository;

    public GetCollectionReportsService(ICollectionRepository collectionRepository)
    {
        _collectionRepository = collectionRepository;
    }

    public async Task<CollectionReportsDto> ExecuteAsync(
        GetCollectionReportsQuery query,
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

        return await _collectionRepository.GetReportsAsync(query.CollectionId, cancellationToken);
    }
}
