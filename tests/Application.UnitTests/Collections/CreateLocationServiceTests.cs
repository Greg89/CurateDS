using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.CreateLocation;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateLocationServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldCreateLocation_WhenNameIsAvailable()
    {
        var repository = new FakeLocationRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateLocationService(
            repository,
            unitOfWork,
            new FakeCurrentUserService(),
            new CreateLocationCommandValidator());

        var result = await service.ExecuteAsync(
            new CreateLocationCommand("auth0|test-owner", "Hall Closet", null),
            CancellationToken.None);

        result.Name.Should().Be("Hall Closet");
        repository.AddCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenNameAlreadyExists()
    {
        const string ownerId = "auth0|test-owner";
        var repository = new FakeLocationRepository(existingName: "Hall Closet", ownerId: ownerId);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateLocationService(
            repository,
            unitOfWork,
            new FakeCurrentUserService(),
            new CreateLocationCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateLocationCommand(ownerId, "Hall Closet", null),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .Where(exception => exception.Errors.Any(error =>
                error.PropertyName == nameof(CreateLocationCommand.Name) &&
                error.ErrorMessage == "A location with this name already exists."));
        repository.AddCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(0);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldNotThrow_WhenSameNameExistsForDifferentOwner()
    {
        var repository = new FakeLocationRepository(existingName: "Hall Closet", ownerId: "auth0|other-owner");
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateLocationService(
            repository,
            unitOfWork,
            new FakeCurrentUserService(),
            new CreateLocationCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateLocationCommand("auth0|test-owner", "Hall Closet", null),
            CancellationToken.None);

        await act.Should().NotThrowAsync();
        repository.AddCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenNameIsTooShort()
    {
        var repository = new FakeLocationRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateLocationService(
            repository,
            unitOfWork,
            new FakeCurrentUserService(),
            new CreateLocationCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateLocationCommand("auth0|test-owner", "A", null),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
        repository.AddCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(0);
    }

    private sealed class FakeLocationRepository : ILocationRepository
    {
        private readonly List<(string ownerId, string Name)> _existing;

        public FakeLocationRepository()
        {
            _existing = [];
        }

        public FakeLocationRepository(string existingName, string ownerId)
        {
            _existing = [(ownerId, existingName)];
        }

        public int AddCallCount { get; private set; }

        public Task AddAsync(Location location, CancellationToken cancellationToken)
        {
            AddCallCount++;
            return Task.CompletedTask;
        }

        public Task<bool> ExistsByNameAsync(string ownerId, string name, CancellationToken cancellationToken)
        {
            return Task.FromResult(_existing.Any(e => e.ownerId == ownerId && e.Name == name));
        }

        public Task<bool> ExistsByNameExcludingAsync(string ownerId, string name, Guid excludeLocationId, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<Location?> GetByIdAndOwnerAsync(Guid locationId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<Location?>(null);

        public Task<IReadOnlyList<Location>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Location>>([]);

        public Task<bool> SoftDeleteAsync(Guid locationId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);
    }
}
