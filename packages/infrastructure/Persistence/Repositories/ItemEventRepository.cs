using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class ItemEventRepository : IItemEventRepository
{
    private readonly CatalogDbContext _dbContext;

    public ItemEventRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task RecordAsync(ItemEvent itemEvent, CancellationToken cancellationToken)
    {
        await _dbContext.ItemEvents.AddAsync(itemEvent, cancellationToken);
    }

    public async Task<IReadOnlyList<ItemEvent>> ListByItemAsync(
        Guid itemId,
        Guid collectionId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.ItemEvents
            .Where(e => e.ItemId == itemId && e.CollectionId == collectionId)
            .OrderByDescending(e => e.OccurredUtc)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
