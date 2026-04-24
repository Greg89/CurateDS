using CurateDS.Application.Abstractions.Persistence;

namespace CurateDS.Application.Collections.ListLocations;

public sealed class ListLocationsService
{
    private readonly ILocationRepository _locationRepository;

    public ListLocationsService(ILocationRepository locationRepository)
    {
        _locationRepository = locationRepository;
    }

    public async Task<IReadOnlyList<LocationDto>> ExecuteAsync(ListLocationsQuery query, CancellationToken cancellationToken)
    {
        var locations = await _locationRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);

        return locations
            .Select(location => new LocationDto(location.Id, location.Name, location.Description, location.CreatedUtc))
            .ToArray();
    }
}
