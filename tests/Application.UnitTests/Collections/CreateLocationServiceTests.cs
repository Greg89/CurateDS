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
        var service = new CreateLocationService(repository, new FakeCurrentUserService(), new CreateLocationCommandValidator());

        var result = await service.ExecuteAsync(
            new CreateLocationCommand(Guid.NewGuid(), "Hall Closet", null),
            CancellationToken.None);

        result.Name.Should().Be("Hall Closet");
        repository.AddCallCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenNameAlreadyExists()
    {
        var ownerId = Guid.NewGuid();
        var repository = new FakeLocationRepository(existingName: "Hall Closet", ownerId: ownerId);
        var service = new CreateLocationService(repository, new FakeCurrentUserService(), new CreateLocationCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateLocationCommand(ownerId, "Hall Closet", null),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .Where(exception => exception.Errors.Any(error =>
                error.PropertyName == nameof(CreateLocationCommand.Name) &&
                error.ErrorMessage == "A location with this name already exists."));
        repository.AddCallCount.Should().Be(0);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldNotThrow_WhenSameNameExistsForDifferentOwner()
    {
        var repository = new FakeLocationRepository(existingName: "Hall Closet", ownerId: Guid.NewGuid());
        var service = new CreateLocationService(repository, new FakeCurrentUserService(), new CreateLocationCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateLocationCommand(Guid.NewGuid(), "Hall Closet", null),
            CancellationToken.None);

        await act.Should().NotThrowAsync();
        repository.AddCallCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenNameIsTooShort()
    {
        var repository = new FakeLocationRepository();
        var service = new CreateLocationService(repository, new FakeCurrentUserService(), new CreateLocationCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateLocationCommand(Guid.NewGuid(), "A", null),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
        repository.AddCallCount.Should().Be(0);
    }

    private sealed class FakeLocationRepository : ILocationRepository
    {
        private readonly List<(Guid OwnerId, string Name)> _existing;

        public FakeLocationRepository()
        {
            _existing = [];
        }

        public FakeLocationRepository(string existingName, Guid ownerId)
        {
            _existing = [(ownerId, existingName)];
        }

        public int AddCallCount { get; private set; }

        public Task AddAsync(Location location, CancellationToken cancellationToken)
        {
            AddCallCount++;
            return Task.CompletedTask;
        }

        public Task<bool> ExistsByNameAsync(Guid ownerId, string name, CancellationToken cancellationToken)
        {
            return Task.FromResult(_existing.Any(e => e.OwnerId == ownerId && e.Name == name));
        }

        public Task<Location?> GetByIdAndOwnerAsync(Guid locationId, Guid ownerId, CancellationToken cancellationToken)
            => Task.FromResult<Location?>(null);

        public Task<IReadOnlyList<Location>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Location>>([]);

        public Task<bool> SoftDeleteAsync(Guid locationId, Guid ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);
    }
}
