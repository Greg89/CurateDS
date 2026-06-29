using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.UpdateTag;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class UpdateTagServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "actor";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRenameTag_WhenKeyIsAvailable()
    {
        const string ownerId = "auth0|test-owner";
        var existing = Tag.Create(ownerId, "Wishlist", DateTime.UtcNow.AddHours(-1), "system");
        var repository = new FakeTagRepository(existing);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new UpdateTagService(repository, unitOfWork, new FakeCurrentUserService(), new UpdateTagCommandValidator());

        var result = await service.ExecuteAsync(
            new UpdateTagCommand(ownerId, existing.Id, " Top Picks "),
            CancellationToken.None);

        result.Name.Should().Be("Top Picks");
        result.Key.Should().Be("top-picks");
        result.UpdatedUtc.Should().NotBeNull();
        repository.SaveCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldBeIdempotent_WhenNameUnchanged()
    {
        const string ownerId = "auth0|test-owner";
        var existing = Tag.Create(ownerId, "Wishlist", DateTime.UtcNow, "system");
        // Rival intentionally normalizes to the same key ("wishlist").
        // If duplicate lookup runs for unchanged names, this test would fail.
        var rival = Tag.Create(ownerId, "WishList", DateTime.UtcNow, "system");
        var repository = new FakeTagRepository(existing, rival);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new UpdateTagService(repository, unitOfWork, new FakeCurrentUserService(), new UpdateTagCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateTagCommand(ownerId, existing.Id, "Wishlist"),
            CancellationToken.None);

        await act.Should().NotThrowAsync();
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowValidationException_WhenNewKeyCollides()
    {
        const string ownerId = "auth0|test-owner";
        var subject = Tag.Create(ownerId, "Wishlist", DateTime.UtcNow, "system");
        var rival = Tag.Create(ownerId, "Top Picks", DateTime.UtcNow, "system");
        var repository = new FakeTagRepository(subject, rival);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new UpdateTagService(repository, unitOfWork, new FakeCurrentUserService(), new UpdateTagCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateTagCommand(ownerId, subject.Id, "Top Picks"),
            CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>()
            .Where(exception => exception.Errors.Any(error =>
                error.PropertyName == nameof(UpdateTagCommand.Name) &&
                error.ErrorCode == "duplicate_tag"));
        repository.SaveCallCount.Should().Be(0);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrowNotFound_WhenTagMissing()
    {
        var repository = new FakeTagRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new UpdateTagService(repository, unitOfWork, new FakeCurrentUserService(), new UpdateTagCommandValidator());

        var act = () => service.ExecuteAsync(
            new UpdateTagCommand("auth0|test-owner", Guid.NewGuid(), "Anything"),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        unitOfWork.ExecutionCount.Should().Be(0);
    }

    private sealed class FakeTagRepository : ITagRepository
    {
        private readonly List<Tag> _tags;

        public FakeTagRepository(params Tag[] tags)
        {
            _tags = tags.ToList();
        }

        public int SaveCallCount { get; private set; }

        public Task AddAsync(Tag tag, CancellationToken cancellationToken)
        {
            _tags.Add(tag);
            return Task.CompletedTask;
        }

        public Task<bool> ExistsByKeyAsync(string ownerId, string key, CancellationToken cancellationToken)
            => Task.FromResult(_tags.Any(tag => tag.OwnerId == ownerId && tag.Key == key));

        public Task<bool> ExistsByKeyExcludingAsync(string ownerId, string key, Guid excludeTagId, CancellationToken cancellationToken)
            => Task.FromResult(_tags.Any(tag => tag.OwnerId == ownerId && tag.Key == key && tag.Id != excludeTagId));

        public Task<Tag?> GetByIdAndOwnerAsync(Guid tagId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult(_tags.SingleOrDefault(tag => tag.Id == tagId && tag.OwnerId == ownerId));

        public Task<IReadOnlyList<Tag>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>(_tags.Where(tag => tag.OwnerId == ownerId).ToArray());

        public Task<IReadOnlyList<Tag>> ListByIdsAsync(string ownerId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>(_tags.Where(tag => tag.OwnerId == ownerId && tagIds.Contains(tag.Id)).ToArray());

        public Task<bool> SoftDeleteAsync(Guid tagId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            SaveCallCount++;
            return Task.CompletedTask;
        }
    }
}
