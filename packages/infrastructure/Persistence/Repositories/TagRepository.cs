using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class TagRepository : ITagRepository
{
    private readonly CatalogDbContext _dbContext;

    public TagRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Tag tag, CancellationToken cancellationToken)
    {
        await _dbContext.Tags.AddAsync(tag, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> ExistsByKeyAsync(Guid ownerId, string key, CancellationToken cancellationToken)
    {
        return _dbContext.Tags.AnyAsync(
            tag => tag.OwnerId == ownerId && tag.Key == key,
            cancellationToken);
    }

    public async Task<IReadOnlyList<Tag>> ListByIdsAsync(Guid ownerId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken)
    {
        return await _dbContext.Tags
            .Where(tag => tag.OwnerId == ownerId && tagIds.Contains(tag.Id))
            .OrderBy(tag => tag.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Tag>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        return await _dbContext.Tags
            .Where(tag => tag.OwnerId == ownerId)
            .OrderBy(tag => tag.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid tagId, Guid ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
    {
        var tag = await _dbContext.Tags
            .SingleOrDefaultAsync(t => t.Id == tagId && t.OwnerId == ownerId, cancellationToken);

        if (tag is null)
            return false;

        var itemTags = await _dbContext.ItemTags
            .Where(it => it.TagId == tagId)
            .ToListAsync(cancellationToken);
        _dbContext.ItemTags.RemoveRange(itemTags);

        tag.SoftDelete(deletedUtc, deletedBy);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
