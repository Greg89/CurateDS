using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ILocationRepository
{
    Task AddAsync(Location location, CancellationToken cancellationToken);

    Task<bool> ExistsByNameAsync(string ownerId, string name, CancellationToken cancellationToken);

    Task<Location?> GetByIdAndOwnerAsync(Guid locationId, string ownerId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Location>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(Guid locationId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);
}
