using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface IAttributeDefinitionRepository
{
    Task AddAsync(AttributeDefinition attributeDefinition, CancellationToken cancellationToken);

    Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken);

    Task<AttributeDefinition?> GetByIdAndCollectionAsync(Guid attributeDefinitionId, Guid collectionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<AttributeDefinition>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken);

    Task<bool> ExistsByKeyExcludingAsync(Guid collectionId, string key, Guid excludeAttributeDefinitionId, CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(Guid attributeDefinitionId, Guid collectionId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);
}
