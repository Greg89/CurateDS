using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.CreateTag;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateTagServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldCreateTag_WhenKeyIsAvailable()
    {
        var repository = new FakeTagRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateTagService(
            repository,
            unitOfWork,
            new FakeCurrentUserService(),
            new CreateTagCommandValidator());

        var result = await service.ExecuteAsync(
            new CreateTagCommand("auth0|test-owner", "Wishlist"),
            CancellationToken.None);

        result.Name.Should().Be("Wishlist");
        result.Key.Should().Be("wishlist");
        repository.AddCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenKeyAlreadyExists()
    {
        const string ownerId = "auth0|test-owner";
        var repository = new FakeTagRepository(
            Tag.Create(ownerId, "Wishlist", DateTime.UtcNow, "system"));
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateTagService(
            repository,
            unitOfWork,
            new FakeCurrentUserService(),
            new CreateTagCommandValidator());

        var act = () => service.ExecuteAsync(
            new CreateTagCommand(ownerId, " Wishlist "),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .Where(exception => exception.Errors.Any(error =>
                error.PropertyName == nameof(CreateTagCommand.Name) &&
                error.ErrorMessage == "A tag with this name already exists."));
        repository.AddCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(0);
    }

    private sealed class FakeTagRepository : ITagRepository
    {
        private readonly List<Tag> _tags;

        public FakeTagRepository(params Tag[] tags)
        {
            _tags = tags.ToList();
        }

        public int AddCallCount { get; private set; }

        public Task AddAsync(Tag tag, CancellationToken cancellationToken)
        {
            AddCallCount++;
            _tags.Add(tag);
            return Task.CompletedTask;
        }

        public Task<bool> ExistsByKeyAsync(string ownerId, string key, CancellationToken cancellationToken)
        {
            return Task.FromResult(_tags.Any(tag => tag.OwnerId == ownerId && tag.Key == key));
        }

        public Task<bool> ExistsByKeyExcludingAsync(string ownerId, string key, Guid excludeTagId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_tags.Any(tag => tag.OwnerId == ownerId && tag.Key == key && tag.Id != excludeTagId));
        }

        public Task<Tag?> GetByIdAndOwnerAsync(Guid tagId, string ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_tags.SingleOrDefault(tag => tag.Id == tagId && tag.OwnerId == ownerId));
        }

        public Task<IReadOnlyList<Tag>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<Tag>>(
                _tags.Where(tag => tag.OwnerId == ownerId).ToArray());
        }

        public Task<IReadOnlyList<Tag>> ListByIdsAsync(string ownerId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<Tag>>(
                _tags.Where(tag => tag.OwnerId == ownerId && tagIds.Contains(tag.Id)).ToArray());
        }

        public Task<bool> SoftDeleteAsync(Guid tagId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);
    }
}
