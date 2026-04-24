using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using FluentValidation;

namespace CurateDS.Application.Collections.CreateLocation;

public sealed class CreateLocationService
{
    private readonly ILocationRepository _locationRepository;
    private readonly IValidator<CreateLocationCommand> _validator;

    public CreateLocationService(ILocationRepository locationRepository, IValidator<CreateLocationCommand> validator)
    {
        _locationRepository = locationRepository;
        _validator = validator;
    }

    public async Task<CreateLocationResult> ExecuteAsync(CreateLocationCommand command, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var location = Location.Create(command.OwnerId, command.Name, command.Description, DateTime.UtcNow);
        await _locationRepository.AddAsync(location, cancellationToken);

        return new CreateLocationResult(location.Id, location.Name, location.Description, location.CreatedUtc);
    }
}
