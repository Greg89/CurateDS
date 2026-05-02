using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;

namespace CurateDS.Application.Collections.CreateSavedView;

public sealed class CreateSavedViewService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly ISavedViewRepository _savedViewRepository;

    public CreateSavedViewService(
        ICollectionRepository collectionRepository,
        ISavedViewRepository savedViewRepository)
    {
        _collectionRepository = collectionRepository;
        _savedViewRepository = savedViewRepository;
    }

    public async Task<SavedViewDto> ExecuteAsync(
        CreateSavedViewCommand command,
        CancellationToken cancellationToken)
    {
        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            command.CollectionId, command.OwnerId, cancellationToken);

        if (collection is null)
            throw new NotFoundException("Collection was not found.");

        var view = SavedView.Create(
            command.CollectionId,
            command.OwnerId,
            command.Name,
            command.FiltersJson,
            DateTime.UtcNow);

        await _savedViewRepository.AddAsync(view, cancellationToken);
        await _savedViewRepository.SaveChangesAsync(cancellationToken);

        return new SavedViewDto(view.Id, view.CollectionId, view.Name, view.FiltersJson, view.CreatedUtc);
    }
}
