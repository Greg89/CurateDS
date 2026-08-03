using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using FluentValidation;

namespace CurateDS.Application.Collections.CreateCollection;

public sealed class CreateCollectionService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateCollectionCommand> _validator;

    public CreateCollectionService(
        ICollectionRepository collectionRepository,
        ICatalogUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IValidator<CreateCollectionCommand> validator)
    {
        _collectionRepository = collectionRepository;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<CreateCollectionResult> ExecuteAsync(
        CreateCollectionCommand command,
        CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var collection = Collection.Create(command.OwnerId, command.Name, DateTime.UtcNow, _currentUser.GetCurrentUser());

        await _unitOfWork.ExecuteInTransactionAsync(
            innerCancellationToken => _collectionRepository.AddAsync(collection, innerCancellationToken),
            cancellationToken);

        return new CreateCollectionResult(collection.Id, collection.Name, collection.CreatedUtc);
    }
}
