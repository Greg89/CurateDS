using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteSavedView;

public sealed class DeleteSavedViewService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly ISavedViewRepository _savedViewRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;

    public DeleteSavedViewService(
        ICollectionRepository collectionRepository,
        ISavedViewRepository savedViewRepository,
        ICatalogUnitOfWork unitOfWork)
    {
        _collectionRepository = collectionRepository;
        _savedViewRepository = savedViewRepository;
        _unitOfWork = unitOfWork;
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

        await _unitOfWork.ExecuteInTransactionAsync(
            innerCancellationToken =>
            {
                _savedViewRepository.Remove(view);
                return Task.CompletedTask;
            },
            cancellationToken);
    }
}
