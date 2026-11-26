using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
namespace CurateDS.Application.Collections.GetCollectionInsights;

public sealed class GetCollectionInsightsService(ICollectionRepository collections, ICollectionInsightsRepository insights)
{
    public async Task<CollectionInsightsDto> ExecuteAsync(string ownerId, Guid collectionId, Guid? attributeDefinitionId, CancellationToken cancellationToken)
    {
        if (await collections.GetByIdAndOwnerAsync(collectionId, ownerId, cancellationToken) is null)
            throw new NotFoundException("Collection was not found.");
        return await insights.GetAsync(collectionId, attributeDefinitionId, cancellationToken);
    }
}
