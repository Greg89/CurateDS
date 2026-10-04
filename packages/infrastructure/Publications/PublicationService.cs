using System.Data;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Common;
using CurateDS.Application.Publications;
using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace CurateDS.Infrastructure.Publications;

public sealed class PublicationService(CatalogDbContext db, IMediaStorageService originals,
    IPublicationStorage storage, IPublicationImageProcessor processor, TimeProvider clock) : IPublicationService
{
    private static readonly SemaphoreSlim ImageSlots = new(2);
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<PublicationStatus> StatusAsync(string owner, Guid collectionId, CancellationToken ct)
    {
        await OwnedAsync(owner, collectionId, ct);
        return Status(await db.Publications.AsNoTracking().SingleOrDefaultAsync(p => p.CollectionId == collectionId, ct));
    }

    public async Task<PublicationPreview> PrepareAsync(string owner, Guid collectionId, PreparePublication request, CancellationToken ct)
    {
        if (!ShowcasePublication.IsValidSlug(request.Slug)) throw new ArgumentException("Use 3–80 lowercase letters, numbers, and single separating hyphens.");
        var now = Now;
        var token = Guid.NewGuid();
        var staged = await LockedAsync(owner, collectionId, async collection =>
        {
            var head = await HeadAsync(collectionId, ct);
            if (head.Slug is not null && head.Slug != request.Slug) throw new PublicationConflictException("The published slug is reserved and cannot change.");
            if (await db.ShowcaseEditions.CountAsync(e => e.CollectionId == collectionId && e.ExpiresUtc > now && e.Id != head.ActiveEditionId, ct) >= 5)
                throw new PublicationConflictException("There are already five pending reviews. Wait for one to expire.");
            var snapshot = await PublicationSnapshot.BuildAsync(db, collection, token, request.Slug, request.OmitImages, now, ct);
            var edition = new ShowcaseEdition(token, collectionId, request.Slug, head.Generation, now,
                PublicationJson.Serialize(snapshot.Showcase), collection.ShowcaseShowTypes);
            foreach (var source in snapshot.Images)
                edition.Assets.Add(new(source.AssetToken, token, storage.Key(token, source.AssetToken)));
            db.ShowcaseEditions.Add(edition);
            return (Snapshot: snapshot, Generation: head.Generation);
        }, ct, consistentSnapshot: true);

        // The durable staged rows exist before any object write. A failed or interrupted write is retryably cleaned up.
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromMinutes(2));
        var lengths = new Dictionary<Guid, int>();
        try
        {
            foreach (var source in staged.Snapshot.Images)
            {
                await ImageSlots.WaitAsync(deadline.Token);
                try
                {
                if (source.SizeBytes is <= 0 or > 20 * 1024 * 1024 ||
                    source.ContentType.ToLowerInvariant() is not ("image/jpeg" or "image/png" or "image/webp" or "image/gif"))
                    throw new PublicationMediaException();
                var bytes = await originals.ReadAsync(source.StorageKey, source.SizeBytes, deadline.Token);
                if (bytes is null || bytes.LongLength != source.SizeBytes) throw new PublicationMediaException();
                var derivative = processor.Convert(bytes);
                await storage.WriteAsync(storage.Key(token, source.AssetToken), derivative, deadline.Token);
                lengths.Add(source.AssetToken, derivative.Length);
                }
                finally { ImageSlots.Release(); }
            }
        }
        catch (Exception error) when (error is IOException or InvalidDataException or PublicationMediaException)
        { throw new PublicationMediaException(); }
        db.ChangeTracker.Clear();
        return await LockedAsync(owner, collectionId, async _ =>
        {
            var head = await HeadAsync(collectionId, ct);
            if (head.Generation != staged.Generation) throw new PublicationConflictException();
            var edition = await db.ShowcaseEditions.Include(e => e.Assets).SingleAsync(e => e.Id == token, ct);
            if (edition.ExpiresUtc <= Now) throw new PublicationConflictException();
            foreach (var asset in edition.Assets) asset.Complete(lengths[asset.Id]);
            edition.MarkReady();
            return Preview(edition);
        }, ct);
    }

    public async Task<PublicationPreview> PreviewAsync(string owner, Guid collectionId, Guid token, CancellationToken ct)
    {
        await OwnedAsync(owner, collectionId, ct);
        return Preview(await CandidateAsync(collectionId, token, ct));
    }

    public async Task<PublicationStatus> PublishAsync(string owner, Guid collectionId, PublishPublication request, CancellationToken ct)
    {
        return await LockedAsync(owner, collectionId, async _ =>
        {
            var head = await HeadAsync(collectionId, ct);
            var edition = await db.ShowcaseEditions.Include(e => e.Assets).SingleOrDefaultAsync(e => e.Id == request.CandidateToken && e.CollectionId == collectionId, ct)
                ?? throw new PublicationConflictException();
            // Only an exact still-active retry is idempotent; no consumed candidate can reactivate a publication.
            if (head.ActiveEditionId == edition.Id && edition.PublishedUtc is not null) return Status(head);
            if (edition.Assets.Any(a => a.SizeBytes is <= 0 or > PublicationImageProcessor.MaximumBytes)) throw new PublicationConflictException();
            // Recheck staged objects before the atomic activation; storage failure keeps the old edition active.
            foreach (var asset in edition.Assets)
            {
                var bytes = await storage.ReadAsync(asset.StorageKey, asset.SizeBytes, ct);
                if (bytes?.Length != asset.SizeBytes) throw new PublicationMediaException();
            }
            try { head.Publish(edition, request.ExpectedGeneration, Now); }
            catch (InvalidOperationException) { throw new PublicationConflictException(); }
            return Status(head);
        }, ct);
    }

    public Task<PublicationStatus> UnpublishAsync(string owner, Guid collectionId, CancellationToken ct) =>
        LockedAsync(owner, collectionId, async _ =>
        {
            var head = await HeadAsync(collectionId, ct);
            // Advance even when already unpublished: outstanding reviews must also be invalidated.
            head.Revoke(null);
            return Status(head);
        }, ct);

    public async Task<PublicShowcase> PublicAsync(string slug, Guid? revision, CancellationToken ct)
    {
        var edition = await ActiveAsync(slug, revision, ct);
        return PublicationJson.Read(edition.Payload) with { PublishedUtc = edition.PublishedUtc };
    }

    public async Task<PublicationImage> PublicImageAsync(string slug, Guid revision, Guid asset, CancellationToken ct)
    {
        var edition = await ActiveAsync(slug, revision, ct);
        return await ImageAsync(edition.Id, asset, ct);
    }

    public async Task<PublicationImage> PreviewImageAsync(string owner, Guid collectionId, Guid token, Guid asset, CancellationToken ct)
    {
        await OwnedAsync(owner, collectionId, ct);
        await CandidateAsync(collectionId, token, ct);
        return await ImageAsync(token, asset, ct);
    }

    private async Task<PublicationImage> ImageAsync(Guid editionId, Guid asset, CancellationToken ct)
    {
        var entry = await db.ShowcaseAssets.AsNoTracking().SingleOrDefaultAsync(a => a.EditionId == editionId && a.Id == asset, ct)
            ?? throw new NotFoundException("Showcase unavailable.");
        if (entry.SizeBytes is <= 0 or > PublicationImageProcessor.MaximumBytes) throw new IOException("Showcase unavailable.");
        var bytes = await storage.ReadAsync(entry.StorageKey, entry.SizeBytes, ct);
        if (bytes?.Length != entry.SizeBytes) throw new IOException("Showcase unavailable.");
        return new(bytes);
    }

    private async Task<ShowcaseEdition> CandidateAsync(Guid collectionId, Guid token, CancellationToken ct)
    {
        var now = Now;
        return await (from e in db.ShowcaseEditions.AsNoTracking()
                      join p in db.Publications on e.CollectionId equals p.CollectionId
                      where e.Id == token && e.CollectionId == collectionId && e.Ready && e.ExpiresUtc > now &&
                            e.PublishedUtc == null && e.Generation == p.Generation
                      select e).SingleOrDefaultAsync(ct) ?? throw new NotFoundException("Review unavailable.");
    }

    private async Task<ShowcaseEdition> ActiveAsync(string slug, Guid? revision, CancellationToken ct)
    {
        if (!ShowcasePublication.IsValidSlug(slug)) throw new NotFoundException("Showcase unavailable.");
        // One query verifies the live source, head, and exact edition. No owner response is used on this path.
        return await (from head in db.Publications.AsNoTracking()
                      join collection in db.Collections on head.CollectionId equals collection.Id
                      join edition in db.ShowcaseEditions on head.ActiveEditionId equals (Guid?)edition.Id
                      where head.Slug == slug && (!revision.HasValue || edition.Id == revision.Value) && edition.Ready
                      select edition).SingleOrDefaultAsync(ct) ?? throw new NotFoundException("Showcase unavailable.");
    }

    public async Task<int> CleanupAsync(CancellationToken ct)
    {
        // A grace period exceeds the two-minute preparation deadline; active editions are never cleanup candidates.
        var cutoff = Now.AddHours(-1);
        var candidates = await db.ShowcaseEditions.AsNoTracking()
            .Where(e => e.ExpiresUtc < cutoff && !db.Publications.Any(p => p.ActiveEditionId == e.Id))
            .OrderBy(e => e.ExpiresUtc).Take(10).Select(e => new { e.Id, e.CollectionId }).ToListAsync(ct);
        var removed = 0;
        foreach (var candidate in candidates)
        {
            await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
            await PublicationTransactions.LockAsync(db, candidate.CollectionId, ct);
            if (await db.Publications.AnyAsync(p => p.ActiveEditionId == candidate.Id, ct)) continue;
            var edition = await db.ShowcaseEditions.Include(e => e.Assets).SingleOrDefaultAsync(e => e.Id == candidate.Id, ct);
            if (edition is null) continue;
            foreach (var asset in edition.Assets) await storage.DeleteAsync(asset.StorageKey, ct);
            db.ShowcaseEditions.Remove(edition);
            await db.SaveChangesAsync(ct);
            if (tx is not null) await tx.CommitAsync(ct);
            removed++;
        }
        return removed;
    }

    private Task<Collection> OwnedAsync(string owner, Guid id, CancellationToken ct) => OwnedCoreAsync(owner, id, ct);
    private async Task<Collection> OwnedCoreAsync(string owner, Guid id, CancellationToken ct) =>
        await db.Collections.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id && c.OwnerId == owner, ct)
        ?? throw new NotFoundException("Collection unavailable.");
    private async Task<ShowcasePublication> HeadAsync(Guid id, CancellationToken ct)
    {
        var head = await db.Publications.SingleOrDefaultAsync(p => p.CollectionId == id, ct);
        if (head is not null) return head;
        head = new(id); db.Publications.Add(head); return head;
    }
    private async Task<T> LockedAsync<T>(string owner, Guid id, Func<Collection, Task<T>> action, CancellationToken ct, bool consistentSnapshot = false)
    {
        try
        {
            await using var tx = db.Database.IsRelational()
                ? await db.Database.BeginTransactionAsync(db.Database.IsNpgsql() ? (consistentSnapshot ? IsolationLevel.RepeatableRead : IsolationLevel.ReadCommitted) : IsolationLevel.Serializable, ct) : null;
            await PublicationTransactions.LockAsync(db, id, ct);
            var collection = await OwnedAsync(owner, id, ct);
            var result = await action(collection);
            await db.SaveChangesAsync(ct);
            if (tx is not null) await tx.CommitAsync(ct);
            return result;
        }
        catch (DbUpdateException error) when (error.InnerException is PostgresException { SqlState: "23505" } || error.InnerException?.Message.Contains("UNIQUE constraint failed: showcase_publications.Slug", StringComparison.Ordinal) == true)
        { throw new PublicationConflictException("That slug is already reserved. Choose another and prepare a new review."); }
        catch (DbUpdateConcurrencyException) { throw new PublicationConflictException(); }
        catch (PostgresException error) when (error.SqlState is "40001" or "40P01") { throw new PublicationConflictException(); }
    }
    private static PublicationStatus Status(ShowcasePublication? head) => new(
        head?.ActiveEditionId is not null ? "published" : head?.SuspensionReason is not null ? "suspended" : "unpublished",
        head?.Slug, head?.Generation ?? 0, head?.ActiveEditionId, head?.PublishedUtc, head?.SuspensionReason);
    private static PublicationPreview Preview(ShowcaseEdition edition) => new(edition.Id, edition.ExpiresUtc, edition.Generation,
        PublicationJson.Read(edition.Payload), ["Summary and reports include the entire collection as of this review.",
            "The public cover uses the collection theme; external cover links are not shared.",
            "Only images shown in this review will be published. Truncated descriptions are marked."]);
}
