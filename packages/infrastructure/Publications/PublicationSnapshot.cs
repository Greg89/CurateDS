using CurateDS.Application.Publications;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Publications;

internal sealed record ImageSource(Guid AssetToken, string StorageKey, long SizeBytes, string ContentType);
internal sealed record PreparedSnapshot(PublicShowcase Showcase, ImageSource[] Images);

internal static class PublicationSnapshot
{
    public static async Task<PreparedSnapshot> BuildAsync(CatalogDbContext db, Collection collection,
        Guid revision, string slug, bool omitImages, DateTime now, CancellationToken ct)
    {
        var items = db.Items.AsNoTracking().Where(i => i.CollectionId == collection.Id);
        var pinIds = collection.ShowPinnedItems ? collection.PinnedItemIds.ToArray() : [];
        var pinned = await items.Where(i => pinIds.Contains(i.Id)).ToListAsync(ct);
        var recent = collection.ShowRecentItems
            ? await items.Where(i => !pinIds.Contains(i.Id)).OrderByDescending(i => i.CreatedUtc).ThenBy(i => i.Id).Take(6).ToListAsync(ct)
            : [];
        var visibleIds = pinned.Select(i => i.Id).Concat(recent.Select(i => i.Id)).ToArray();
        // At most twelve source images; project a single primary per item in SQL.
        var media = new List<MediaAsset>();
        if (!omitImages)
            foreach (var id in visibleIds)
            {
                var primary = await db.MediaAssets.AsNoTracking().Where(a => a.ItemId == id && a.CollectionId == collection.Id && a.IsPrimary)
                    .OrderBy(a => a.UploadedUtc).ThenBy(a => a.Id).FirstOrDefaultAsync(ct);
                if (primary is not null) media.Add(primary);
            }
        var images = new List<ImageSource>();
        PublicItem Map(Item item)
        {
            var asset = media.FirstOrDefault(a => a?.ItemId == item.Id);
            Guid? image = null;
            if (asset is not null)
            {
                image = Guid.NewGuid();
                images.Add(new(image.Value, asset.StorageKey, asset.SizeBytes, asset.ContentType));
            }
            var description = item.Description;
            var truncated = description?.Length > 1000;
            if (truncated) description = description![..1000];
            return new(Guid.NewGuid(), item.Name, description, truncated, image);
        }
        var highlights = collection.ShowPinnedItems ? pinIds.Where(id => pinned.Any(i => i.Id == id))
            .Select(id => Map(pinned.Single(i => i.Id == id))).ToArray() : null;
        var recentCards = collection.ShowRecentItems ? recent.Select(Map).ToArray() : null;
        PublicSummary? summary = null;
        if (collection.ShowSummary)
            summary = new(await items.CountAsync(ct),
                await db.MediaAssets.CountAsync(a => items.Any(i => i.Id == a.ItemId), ct),
                await db.ItemTags.Where(t => items.Any(i => i.Id == t.ItemId)).Select(t => t.TagId).Distinct().CountAsync(ct));
        PublicMonth[]? growth = null;
        if (collection.ShowcaseShowGrowth)
        {
            var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11);
            var end = start.AddMonths(12);
            var months = await items.Where(i => i.CreatedUtc >= start && i.CreatedUtc < end)
                .GroupBy(i => new { i.CreatedUtc.Year, i.CreatedUtc.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() }).ToListAsync(ct);
            growth = Enumerable.Range(0, 12).Select(index =>
            {
                var from = start.AddMonths(index);
                return new PublicMonth(from, from.AddMonths(1), months.SingleOrDefault(m => m.Year == from.Year && m.Month == from.Month)?.Count ?? 0);
            }).ToArray();
        }
        PublicTypes? types = null;
        if (collection.ShowcaseShowTypes)
        {
            var groups = items.GroupBy(i => i.ItemTypeId).Select(g => new { Id = g.Key, Count = g.Count() });
            var named = from g in groups
                        join t in db.ItemTypes on g.Id equals (Guid?)t.Id into names
                        from t in names.DefaultIfEmpty()
                        select new { g.Id, g.Count, Name = t == null ? "No item type" : t.Name };
            var top = await named.OrderByDescending(g => g.Count).ThenBy(g => g.Name).ThenBy(g => g.Id).Take(6).ToListAsync(ct);
            types = new(top.Select(g => new PublicType(g.Name, g.Count)).ToArray(), await groups.CountAsync(ct));
        }
        return new(new PublicShowcase(1, slug, revision, now, null, collection.Name,
            collection.Category, collection.Description, collection.ShowcaseLayout, collection.Color ?? "forest",
            collection.ItemLabel, collection.ItemsLabel, collection.ShowCover, summary, highlights, recentCards, growth, types), images.ToArray());
    }
}
