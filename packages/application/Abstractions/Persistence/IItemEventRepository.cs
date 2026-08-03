using CurateDS.Application.Collections;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface IItemEventRepository
{
    Task RecordAsync(ItemEvent itemEvent, CancellationToken cancellationToken);

    Task<IReadOnlyList<ItemEvent>> ListByItemAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken);

    Task<PagedResult<CollectionActivityEventDto>> ListByCollectionAsync(Guid collectionId, int page, int pageSize, CancellationToken cancellationToken);
}
