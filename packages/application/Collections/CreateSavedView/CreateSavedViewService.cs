using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;

namespace CurateDS.Application.Collections.CreateSavedView;

public sealed class CreateSavedViewService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly ISavedViewRepository _savedViewRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly IValidator<CreateSavedViewCommand> _validator;

    public CreateSavedViewService(
        ICollectionRepository collectionRepository,
        ISavedViewRepository savedViewRepository,
        ICatalogUnitOfWork unitOfWork,
        IValidator<CreateSavedViewCommand> validator)
    {
        _collectionRepository = collectionRepository;
        _savedViewRepository = savedViewRepository;
        _unitOfWork = unitOfWork;
        _validator = validator;
    }

    public async Task<SavedViewDto> ExecuteAsync(
        CreateSavedViewCommand command,
        CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);
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

        await _unitOfWork.ExecuteInTransactionAsync(
            innerCancellationToken => _savedViewRepository.AddAsync(view, innerCancellationToken),
            cancellationToken);

        return new SavedViewDto(view.Id, view.CollectionId, view.Name, view.FiltersJson, view.CreatedUtc);
    }
}
