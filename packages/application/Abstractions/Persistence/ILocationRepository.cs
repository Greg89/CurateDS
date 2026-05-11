using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ILocationRepository
{
    Task AddAsync(Location location, CancellationToken cancellationToken);

    Task<bool> ExistsByNameAsync(string OwnerId, string name, CancellationToken cancellationToken);

    Task<Location?> GetByIdAndOwnerAsync(Guid locationId, string OwnerId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Location>> ListByOwnerAsync(string OwnerId, CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(Guid locationId, string OwnerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);
}
