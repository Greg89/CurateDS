using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteCollection;

public sealed class DeleteCollectionService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly ICurrentUserService _currentUser;

    public DeleteCollectionService(ICollectionRepository collectionRepository, ICurrentUserService currentUser)
    {
        _collectionRepository = collectionRepository;
        _currentUser = currentUser;
    }

    public async Task ExecuteAsync(DeleteCollectionCommand command, CancellationToken cancellationToken)
    {
        var deleted = await _collectionRepository.SoftDeleteAsync(
            command.CollectionId,
            command.OwnerId,
            DateTime.UtcNow,
            _currentUser.GetCurrentUser(),
            cancellationToken);

        if (!deleted)
        {
            throw new NotFoundException("Collection was not found.");
        }
    }
}
