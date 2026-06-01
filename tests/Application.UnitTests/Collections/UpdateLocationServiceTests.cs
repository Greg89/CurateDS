using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.UpdateLocation;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class UpdateLocationServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "actor";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldUpdateLocation()
    {
        const string ownerId = "auth0|test-owner";
        var existing = Location.Create(ownerId, "Shelf", "Old", DateTime.UtcNow, "system");
        var repository = new FakeLocationRepository(existing);
        var service = new UpdateLocationService(repository, new FakeCurrentUserService(), new UpdateLocationCommandValidator());

        var result = await service.ExecuteAsync(
            new UpdateLocationCommand(ownerId, existing.Id, "Cabinet", "Drawer 3"),
            CancellationToken.None);

        result.Name.Should().Be("Cabinet");
        result.Description.Should().Be("Drawer 3");
        result.UpdatedUtc.Should().NotBeNull();
        repository.SaveCallCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenNameAlreadyTaken()
    {
        const string ownerId = "auth0|test-owner";
        var subject = Location.Create(ownerId, "Shelf", null, DateTime.UtcNow, "system");
        var rival = Location.Create(ownerId, "Cabinet", null, DateTime.UtcNow, "system");
        var repository = new FakeLocationRepository(subject, rival);
        var service = new UpdateLocationService(repository, new FakeCurrentUserService(), new UpdateLocationCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateLocationCommand(ownerId, subject.Id, "Cabinet", null),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .Where(exception => exception.Errors.Any(error => error.ErrorCode == "duplicate_location"));
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowNotFound_WhenLocationMissing()
    {
        var repository = new FakeLocationRepository();
        var service = new UpdateLocationService(repository, new FakeCurrentUserService(), new UpdateLocationCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateLocationCommand("auth0|test-owner", Guid.NewGuid(), "Anywhere", null),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    private sealed class FakeLocationRepository : ILocationRepository
    {
        private readonly List<Location> _locations;

        public FakeLocationRepository(params Location[] locations)
        {
            _locations = locations.ToList();
        }

        public int SaveCallCount { get; private set; }

        public Task AddAsync(Location location, CancellationToken cancellationToken)
        {
            _locations.Add(location);
            return Task.CompletedTask;
        }

        public Task<bool> ExistsByNameAsync(string ownerId, string name, CancellationToken cancellationToken)
            => Task.FromResult(_locations.Any(loc => loc.OwnerId == ownerId && loc.Name == name));

        public Task<bool> ExistsByNameExcludingAsync(string ownerId, string name, Guid excludeLocationId, CancellationToken cancellationToken)
            => Task.FromResult(_locations.Any(loc => loc.OwnerId == ownerId && loc.Name == name && loc.Id != excludeLocationId));

        public Task<Location?> GetByIdAndOwnerAsync(Guid locationId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult(_locations.SingleOrDefault(loc => loc.Id == locationId && loc.OwnerId == ownerId));

        public Task<IReadOnlyList<Location>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Location>>(_locations.Where(loc => loc.OwnerId == ownerId).ToArray());

        public Task<bool> SoftDeleteAsync(Guid locationId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            SaveCallCount++;
            return Task.CompletedTask;
        }
    }
}
