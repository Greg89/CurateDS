using CurateDS.Application.Collections;
namespace CurateDS.Application.Abstractions.Persistence;
public interface ICollectionInsightsRepository
{
    Task<CollectionInsightsDto> GetAsync(Guid collectionId, Guid? attributeDefinitionId, CancellationToken cancellationToken);
}
