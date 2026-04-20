using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class ItemRepository : IItemRepository
{
    private readonly CatalogDbContext _dbContext;

    public ItemRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Item item, CancellationToken cancellationToken)
    {
        await _dbContext.Items.AddAsync(item, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<Item?> GetByIdAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken)
    {
        return await _dbContext.Items
            .Include(item => item.AttributeValues)
            .SingleOrDefaultAsync(
                item => item.Id == itemId && item.CollectionId == collectionId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<Item>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        return await _dbContext.Items
            .Include(item => item.AttributeValues)
            .Where(item => item.CollectionId == collectionId)
            .OrderByDescending(item => item.CreatedUtc)
            .ToListAsync(cancellationToken);
    }
}
