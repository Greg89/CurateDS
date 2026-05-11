using CurateDS.Application.Collections;
using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ICollectionRepository
{
    Task AddAsync(Collection collection, CancellationToken cancellationToken);

    Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, string OwnerId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Collection>> ListByOwnerAsync(string OwnerId, CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(Guid collectionId, string OwnerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);

    Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken);

    Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken);
}
