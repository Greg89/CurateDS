using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface IItemEventRepository
{
    Task RecordAsync(ItemEvent itemEvent, CancellationToken cancellationToken);

    Task<IReadOnlyList<ItemEvent>> ListByItemAsync(Guid itemId, Guid collectionId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
