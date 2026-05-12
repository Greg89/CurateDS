using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class SavedViewRepository : ISavedViewRepository
{
    private readonly CatalogDbContext _dbContext;

    public SavedViewRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(SavedView savedView, CancellationToken cancellationToken)
    {
        await _dbContext.SavedViews.AddAsync(savedView, cancellationToken);
    }

    public async Task<IReadOnlyList<SavedView>> ListByCollectionAsync(Guid collectionId, string ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.SavedViews
            .Where(v => v.CollectionId == collectionId && v.OwnerId == ownerId)
            .OrderBy(v => v.CreatedUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<SavedView?> GetByIdAsync(Guid id, string ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.SavedViews
            .FirstOrDefaultAsync(v => v.Id == id && v.OwnerId == ownerId, cancellationToken);
    }

    public void Remove(SavedView savedView)
    {
        _dbContext.SavedViews.Remove(savedView);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
