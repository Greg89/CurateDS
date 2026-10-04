using CurateDS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Publications;

internal static class PublicationTransactions
{
    // Publication and source-removal writes take this same lock before changing either state.
    public static async Task LockAsync(CatalogDbContext db, Guid collectionId, CancellationToken ct)
    {
        if (!db.Database.IsRelational()) return;
        if (db.Database.CurrentTransaction is null) throw new InvalidOperationException("A publication lock requires a transaction.");
        if (db.Database.IsNpgsql())
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM collections WHERE \"Id\" = {collectionId} FOR UPDATE", ct);
        else
            await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE collections SET \"Name\" = \"Name\" WHERE \"Id\" = {collectionId}", ct);
    }

    public static async Task SuspendAsync(CatalogDbContext db, Guid collectionId, string reason, CancellationToken ct)
    {
        await LockAsync(db, collectionId, ct);
        var head = await db.Publications.SingleOrDefaultAsync(p => p.CollectionId == collectionId, ct);
        if (head is null) return;
        // Type removal can change a frozen type report, including its truncated-group count.
        if (reason == "type_deleted" && !await db.ShowcaseEditions.AnyAsync(e =>
                e.CollectionId == collectionId && e.IncludesTypes &&
                (e.Id == head.ActiveEditionId || (e.Generation == head.Generation && e.ExpiresUtc > DateTime.UtcNow)), ct)) return;
        head.Revoke(reason);
    }
}
