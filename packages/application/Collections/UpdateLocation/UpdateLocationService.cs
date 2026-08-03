using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.UpdateLocation;

public sealed class UpdateLocationService
{
    private readonly ILocationRepository _locationRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<UpdateLocationCommand> _validator;

    public UpdateLocationService(
        ILocationRepository locationRepository,
        ICatalogUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IValidator<UpdateLocationCommand> validator)
    {
        _locationRepository = locationRepository;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<UpdateLocationResult> ExecuteAsync(UpdateLocationCommand command, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var location = await _locationRepository.GetByIdAndOwnerAsync(command.LocationId, command.OwnerId, cancellationToken)
            ?? throw new NotFoundException("Location was not found.");

        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        return await _unitOfWork.ExecuteInTransactionAsync(
            async innerCancellationToken =>
            {
                var originalName = location.Name;
                location.Update(command.Name, command.Description, now, actor);

                if (location.Name != originalName
                    && await _locationRepository.ExistsByNameExcludingAsync(command.OwnerId, location.Name, location.Id, innerCancellationToken))
                {
                    throw new ValidationException([
                        new ValidationFailure(nameof(UpdateLocationCommand.Name), "A location with this name already exists.")
                        {
                            ErrorCode = "duplicate_location"
                        }
                    ]);
                }

                return new UpdateLocationResult(
                    location.Id,
                    location.Name,
                    location.Description,
                    location.CreatedUtc,
                    location.UpdatedUtc);
            },
            cancellationToken);
    }
}
