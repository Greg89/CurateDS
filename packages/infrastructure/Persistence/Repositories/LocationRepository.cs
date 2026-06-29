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
    }

    public Task<bool> ExistsByNameAsync(string ownerId, string name, CancellationToken cancellationToken)
    {
        return _dbContext.Locations.AnyAsync(
            location => location.OwnerId == ownerId && location.Name == name,
            cancellationToken);
    }

    public Task<bool> ExistsByNameExcludingAsync(string ownerId, string name, Guid excludeLocationId, CancellationToken cancellationToken)
    {
        return _dbContext.Locations.AnyAsync(
            location => location.OwnerId == ownerId && location.Name == name && location.Id != excludeLocationId,
            cancellationToken);
    }

    public async Task<Location?> GetByIdAndOwnerAsync(Guid locationId, string ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.Locations
            .SingleOrDefaultAsync(location => location.Id == locationId && location.OwnerId == ownerId, cancellationToken);
    }

    public async Task<IReadOnlyList<Location>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.Locations
            .Where(location => location.OwnerId == ownerId)
            .OrderBy(location => location.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid locationId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
    {
        var location = await _dbContext.Locations
            .SingleOrDefaultAsync(l => l.Id == locationId && l.OwnerId == ownerId, cancellationToken);

        if (location is null)
            return false;

        var affectedItems = await _dbContext.Items
            .Where(i => i.LocationId == locationId)
            .ToListAsync(cancellationToken);
        foreach (var item in affectedItems)
        {
            item.AssignLocation(null, deletedUtc, deletedBy);
        }

        location.SoftDelete(deletedUtc, deletedBy);
        return true;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
