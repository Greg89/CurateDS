using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence.Repositories;

public sealed class AttributeDefinitionRepository : IAttributeDefinitionRepository
{
    private readonly CatalogDbContext _dbContext;

    public AttributeDefinitionRepository(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(AttributeDefinition attributeDefinition, CancellationToken cancellationToken)
    {
        await _dbContext.AttributeDefinitions.AddAsync(attributeDefinition, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        var nextSortOrder = await _dbContext.AttributeDefinitions
            .Where(attributeDefinition => attributeDefinition.CollectionId == collectionId)
            .Select(attributeDefinition => (int?)attributeDefinition.SortOrder)
            .MaxAsync(cancellationToken);

        return (nextSortOrder ?? -1) + 1;
    }

    public async Task<AttributeDefinition?> GetByIdAndCollectionAsync(Guid attributeDefinitionId, Guid collectionId, CancellationToken cancellationToken)
    {
        return await _dbContext.AttributeDefinitions
            .SingleOrDefaultAsync(
                attributeDefinition => attributeDefinition.Id == attributeDefinitionId
                    && attributeDefinition.CollectionId == collectionId,
                cancellationToken);
    }

    public Task<bool> ExistsByKeyExcludingAsync(Guid collectionId, string key, Guid excludeAttributeDefinitionId, CancellationToken cancellationToken)
    {
        return _dbContext.AttributeDefinitions.AnyAsync(
            attributeDefinition => attributeDefinition.CollectionId == collectionId
                && attributeDefinition.Key == key
                && attributeDefinition.Id != excludeAttributeDefinitionId,
            cancellationToken);
    }

    public async Task<IReadOnlyList<AttributeDefinition>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken)
    {
        return await _dbContext.AttributeDefinitions
            .Where(attributeDefinition => attributeDefinition.CollectionId == collectionId)
            .OrderBy(attributeDefinition => attributeDefinition.SortOrder)
            .ThenBy(attributeDefinition => attributeDefinition.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid attributeDefinitionId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
    {
        var attributeDefinition = await _dbContext.AttributeDefinitions
            .SingleOrDefaultAsync(a => a.Id == attributeDefinitionId && a.CollectionId == collectionId, cancellationToken);

        if (attributeDefinition is null)
            return false;

        var attributeValues = await _dbContext.ItemAttributeValues
            .Where(iav => iav.AttributeDefinitionId == attributeDefinitionId)
            .ToListAsync(cancellationToken);
        _dbContext.ItemAttributeValues.RemoveRange(attributeValues);

        attributeDefinition.SoftDelete(deletedUtc, deletedBy);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
