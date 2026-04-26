using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ILocationRepository
{
    Task AddAsync(Location location, CancellationToken cancellationToken);

    Task<Location?> GetByIdAndOwnerAsync(Guid locationId, Guid ownerId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Location>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(Guid locationId, Guid ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);
}
