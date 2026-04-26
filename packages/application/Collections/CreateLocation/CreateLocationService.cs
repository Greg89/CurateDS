using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using FluentValidation;

namespace CurateDS.Application.Collections.CreateLocation;

public sealed class CreateLocationService
{
    private readonly ILocationRepository _locationRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateLocationCommand> _validator;

    public CreateLocationService(ILocationRepository locationRepository, ICurrentUserService currentUser, IValidator<CreateLocationCommand> validator)
    {
        _locationRepository = locationRepository;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<CreateLocationResult> ExecuteAsync(CreateLocationCommand command, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var location = Location.Create(command.OwnerId, command.Name, command.Description, DateTime.UtcNow, _currentUser.GetCurrentUser());
        await _locationRepository.AddAsync(location, cancellationToken);

        return new CreateLocationResult(location.Id, location.Name, location.Description, location.CreatedUtc);
    }
}
