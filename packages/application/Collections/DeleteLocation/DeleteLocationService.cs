using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteLocation;

public sealed class DeleteLocationService
{
    private readonly ILocationRepository _locationRepository;
    private readonly ICurrentUserService _currentUser;

    public DeleteLocationService(ILocationRepository locationRepository, ICurrentUserService currentUser)
    {
        _locationRepository = locationRepository;
        _currentUser = currentUser;
    }

    public async Task ExecuteAsync(DeleteLocationCommand command, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        var deleted = await _locationRepository.SoftDeleteAsync(
            command.LocationId,
            command.OwnerId,
            now,
            actor,
            cancellationToken);

        if (!deleted)
        {
            throw new NotFoundException("Location was not found.");
        }
    }
}
