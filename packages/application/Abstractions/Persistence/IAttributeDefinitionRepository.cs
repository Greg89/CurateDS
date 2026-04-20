using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface IAttributeDefinitionRepository
{
    Task AddAsync(AttributeDefinition attributeDefinition, CancellationToken cancellationToken);

    Task<int> GetNextSortOrderAsync(Guid collectionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<AttributeDefinition>> ListByCollectionAsync(Guid collectionId, CancellationToken cancellationToken);
}
