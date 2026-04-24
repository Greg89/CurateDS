using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ITagRepository
{
    Task AddAsync(Tag tag, CancellationToken cancellationToken);

    Task<bool> ExistsByKeyAsync(Guid ownerId, string key, CancellationToken cancellationToken);

    Task<IReadOnlyList<Tag>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Tag>> ListByIdsAsync(Guid ownerId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken);
}
