using CurateDS.Application.Collections;
using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ICollectionRepository
{
    Task AddAsync(Collection collection, CancellationToken cancellationToken);

    Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, Guid ownerId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Collection>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(Guid collectionId, Guid ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);

    Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken);

    Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken);
}
