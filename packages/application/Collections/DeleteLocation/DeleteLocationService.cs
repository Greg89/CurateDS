using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteLocation;

public sealed class DeleteLocationService
{
    private readonly ILocationRepository _locationRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public DeleteLocationService(
        ILocationRepository locationRepository,
        ICatalogUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _locationRepository = locationRepository;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task ExecuteAsync(DeleteLocationCommand command, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        await _unitOfWork.ExecuteInTransactionAsync(
            async innerCancellationToken =>
            {
                var deleted = await _locationRepository.SoftDeleteAsync(
                    command.LocationId,
                    command.OwnerId,
                    now,
                    actor,
                    innerCancellationToken);

                if (!deleted)
                {
                    throw new NotFoundException("Location was not found.");
                }
            },
            cancellationToken);
    }
}
