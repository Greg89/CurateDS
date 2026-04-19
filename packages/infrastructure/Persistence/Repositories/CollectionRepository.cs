using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class CollectionRepository : ICollectionRepository
{
    private readonly CatalogDbContext _dbContext;

    public CollectionRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Collection collection, CancellationToken cancellationToken)
    {
        await _dbContext.Collections.AddAsync(collection, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Collection>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.Collections
            .Where(collection => collection.OwnerId == ownerId)
            .OrderByDescending(collection => collection.CreatedUtc)
            .ToListAsync(cancellationToken);
    }
}
