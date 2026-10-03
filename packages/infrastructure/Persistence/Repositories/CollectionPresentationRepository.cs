using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.CollectionPresentation;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class CollectionPresentationRepository(CatalogDbContext db) : ICollectionPresentationRepository
{
    public async Task<IReadOnlyList<PinnedItemProjection>> GetItemsAsync(Guid collectionId, IReadOnlyList<Guid> ids,
        CancellationToken cancellationToken)
    {
        return await db.Items.AsNoTracking().Where(item => item.CollectionId == collectionId && ids.Contains(item.Id))
            .Select(item => new PinnedItemProjection(item.Id, item.CollectionId, item.Name, item.Description, item.CreatedUtc,
                item.MediaAssets.OrderByDescending(media => media.IsPrimary).ThenBy(media => media.UploadedUtc)
                    .Select(media => media.StorageKey).FirstOrDefault()))
            .ToListAsync(cancellationToken);
    }
}
