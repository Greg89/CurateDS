using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.CreateLocation;

public sealed class CreateLocationService
{
    private readonly ILocationRepository _locationRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateLocationCommand> _validator;

    public CreateLocationService(
        ILocationRepository locationRepository,
        ICatalogUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IValidator<CreateLocationCommand> validator)
    {
        _locationRepository = locationRepository;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<CreateLocationResult> ExecuteAsync(CreateLocationCommand command, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        if (await _locationRepository.ExistsByNameAsync(command.OwnerId, command.Name.Trim(), cancellationToken))
        {
            throw new ValidationException([
                new ValidationFailure(nameof(CreateLocationCommand.Name), "A location with this name already exists.")
                {
                    ErrorCode = "duplicate_location"
                }
            ]);
        }

        var location = Location.Create(command.OwnerId, command.Name, command.Description, DateTime.UtcNow, _currentUser.GetCurrentUser());
        await _unitOfWork.ExecuteInTransactionAsync(
            innerCancellationToken => _locationRepository.AddAsync(location, innerCancellationToken),
            cancellationToken);

        return new CreateLocationResult(location.Id, location.Name, location.Description, location.CreatedUtc);
    }
}
