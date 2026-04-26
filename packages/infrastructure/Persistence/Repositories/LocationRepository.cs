using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class LocationRepository : ILocationRepository
{
    private readonly CatalogDbContext _dbContext;

    public LocationRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Location location, CancellationToken cancellationToken)
    {
        await _dbContext.Locations.AddAsync(location, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<Location?> GetByIdAndOwnerAsync(Guid locationId, Guid ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.Locations
            .SingleOrDefaultAsync(location => location.Id == locationId && location.OwnerId == ownerId, cancellationToken);
    }

    public async Task<IReadOnlyList<Location>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.Locations
            .Where(location => location.OwnerId == ownerId)
            .OrderBy(location => location.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid locationId, Guid ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
    {
        var location = await _dbContext.Locations
            .SingleOrDefaultAsync(l => l.Id == locationId && l.OwnerId == ownerId, cancellationToken);

        if (location is null)
            return false;

        await _dbContext.Items
            .Where(i => i.LocationId == locationId)
            .ExecuteUpdateAsync(
                s => s.SetProperty(i => i.LocationId, (Guid?)null)
                       .SetProperty(i => i.UpdatedUtc, deletedUtc)
                       .SetProperty(i => i.UpdatedBy, deletedBy),
                cancellationToken);

        location.SoftDelete(deletedUtc, deletedBy);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
