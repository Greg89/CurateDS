using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
using CurateDS.Application.Common;
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

    public async Task<PagedResult<CollectionActivityEventDto>> ListByCollectionAsync(
        Guid collectionId,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 1, 100);

        var q = _dbContext.ItemEvents
            .Where(e => e.CollectionId == collectionId)
            .OrderByDescending(e => e.OccurredUtc).ThenByDescending(e => e.Id);

        var totalCount = await q.CountAsync(cancellationToken);

        // Keep deleted-item history consistent with the event count; collection access is checked by the service.
        var events = await q
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .Join(
                _dbContext.Items.IgnoreQueryFilters().Where(item => item.CollectionId == collectionId),
                e => e.ItemId,
                i => i.Id,
                (e, i) => new CollectionActivityEventDto(
                    e.Id,
                    e.ItemId,
                    i.Name,
                    e.EventType.ToString(),
                    e.OccurredUtc,
                    e.OccurredBy,
                    e.Notes))
            .ToListAsync(cancellationToken);

        return new PagedResult<CollectionActivityEventDto>(events, totalCount, safePage, safePageSize);
    }
}
