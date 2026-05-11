using CurateDS.Domain.Collections;

namespace CurateDS.Application.Abstractions.Persistence;

public interface ITagRepository
{
    Task AddAsync(Tag tag, CancellationToken cancellationToken);

    Task<bool> ExistsByKeyAsync(string OwnerId, string key, CancellationToken cancellationToken);

    Task<IReadOnlyList<Tag>> ListByOwnerAsync(string OwnerId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Tag>> ListByIdsAsync(string OwnerId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(Guid tagId, string OwnerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken);
}
