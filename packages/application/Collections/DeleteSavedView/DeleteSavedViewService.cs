using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteSavedView;

public sealed class DeleteSavedViewService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly ISavedViewRepository _savedViewRepository;

    public DeleteSavedViewService(
        ICollectionRepository collectionRepository,
        ISavedViewRepository savedViewRepository)
    {
        _collectionRepository = collectionRepository;
        _savedViewRepository = savedViewRepository;
    }

    public async Task ExecuteAsync(DeleteSavedViewCommand command, CancellationToken cancellationToken)
    {
        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            command.CollectionId, command.OwnerId, cancellationToken);

        if (collection is null)
            throw new NotFoundException("Collection was not found.");

        var view = await _savedViewRepository.GetByIdAsync(command.SavedViewId, command.OwnerId, cancellationToken);

        if (view is null)
            throw new NotFoundException("Saved view was not found.");

        _savedViewRepository.Remove(view);
        await _savedViewRepository.SaveChangesAsync(cancellationToken);
    }
}
