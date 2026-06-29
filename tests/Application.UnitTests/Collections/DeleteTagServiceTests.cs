using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.DeleteTag;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class DeleteTagServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSoftDeleteTagInUnitOfWork()
    {
        var tag = Tag.Create("auth0|test-owner", "Wishlist", DateTime.UtcNow, "system");
        var repository = new FakeTagRepository(tag);
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteTagService(repository, unitOfWork, new FakeCurrentUserService());

        await service.ExecuteAsync(
            new DeleteTagCommand(tag.OwnerId, tag.Id),
            CancellationToken.None);

        repository.SoftDeleteCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_WhenTagDoesNotExist()
    {
        var repository = new FakeTagRepository();
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new DeleteTagService(repository, unitOfWork, new FakeCurrentUserService());

        var act = () => service.ExecuteAsync(
            new DeleteTagCommand("auth0|test-owner", Guid.NewGuid()),
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
        repository.SoftDeleteCallCount.Should().Be(1);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    private sealed class FakeTagRepository : ITagRepository
    {
        private readonly List<Tag> _tags;

        public FakeTagRepository(params Tag[] tags)
        {
            _tags = tags.ToList();
        }

        public int SoftDeleteCallCount { get; private set; }

        public Task AddAsync(Tag tag, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<bool> ExistsByKeyAsync(string ownerId, string key, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<bool> ExistsByKeyExcludingAsync(string ownerId, string key, Guid excludeTagId, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<Tag?> GetByIdAndOwnerAsync(Guid tagId, string ownerId, CancellationToken cancellationToken)
            => Task.FromResult(_tags.SingleOrDefault(tag => tag.Id == tagId && tag.OwnerId == ownerId));

        public Task<IReadOnlyList<Tag>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>(_tags.Where(tag => tag.OwnerId == ownerId).ToArray());

        public Task<IReadOnlyList<Tag>> ListByIdsAsync(string ownerId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<Tag>>(_tags.Where(tag => tag.OwnerId == ownerId && tagIds.Contains(tag.Id)).ToArray());

        public Task<bool> SoftDeleteAsync(
            Guid tagId,
            string ownerId,
            DateTime deletedUtc,
            string deletedBy,
            CancellationToken cancellationToken)
        {
            SoftDeleteCallCount++;
            return Task.FromResult(_tags.Any(tag => tag.Id == tagId && tag.OwnerId == ownerId));
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken)
            => Task.CompletedTask;
    }
}
