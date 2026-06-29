using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.DeleteLocation;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class DeleteLocationServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSoftDeleteLocationInUnitOfWork()
    {
        var location = Location.Create("auth0|test-owner", "Hall Closet", null, DateTime.UtcNow, "system");
        var repository = new FakeLocationRepository(location);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteLocationService(repository, unitOfWork, new FakeCurrentUserService());

        await service.ExecuteAsync(
            new DeleteLocationCommand(location.OwnerId, location.Id),
            CancellationToken.None);

        repository.SoftDeleteCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenLocationDoesNotExist()
    {
        var repository = new FakeLocationRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteLocationService(repository, unitOfWork, new FakeCurrentUserService());

        var act = () => service.ExecuteAsync(
            new DeleteLocationCommand("auth0|test-owner", Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        repository.SoftDeleteCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    private sealed class FakeLocationRepository : ILocationRepository
    {
        private readonly List<Location> _locations;

        public FakeLocationRepository(params Location[] locations)
        {
            _locations = locations.ToList();
        }

        public int SoftDeleteCallCount { get; private set; }

        public Task AddAsync(Location location, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<bool> ExistsByNameAsync(string ownerId, string name, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<bool> ExistsByNameExcludingAsync(string ownerId, string name, Guid excludeLocationId, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<Location?> GetByIdAndOwnerAsync(Guid locationId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult(_locations.SingleOrDefault(location => location.Id == locationId && location.OwnerId == ownerId));

        public Task<IReadOnlyList<Location>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Location>>(_locations.Where(location => location.OwnerId == ownerId).ToArray());

        public Task<bool> SoftDeleteAsync(
            Guid locationId,
            string ownerId,
            DateTime deletedUtc,
            string deletedBy,
            CancellationToken cancellationToken)
        {
            SoftDeleteCallCount++;
            return Task.FromResult(_locations.Any(location => location.Id == locationId && location.OwnerId == ownerId));
        }
    }
}
