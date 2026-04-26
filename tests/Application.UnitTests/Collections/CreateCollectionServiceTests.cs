using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.CreateCollection;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateCollectionServiceTests
{
    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string GetCurrentUser() => "system";
    }

    [Fact]
    public async Task ExecuteAsync_ShouldPersistTrimmedCollection()
    {
        var repository = new FakeCollectionRepository();
        var service = new CreateCollectionService(repository, new FakeCurrentUserService(), new CreateCollectionCommandValidator());
        var command = new CreateCollectionCommand(Guid.NewGuid(), "  Vinyl Records  ");

        var result = await service.ExecuteAsync(command, CancellationToken.None);

        result.Name.Should().Be("Vinyl Records");
        repository.Collections.Should().ContainSingle(collection => collection.Id == result.Id);
    }

    private sealed class FakeCollectionRepository : ICollectionRepository
    {
        public List<Collection> Collections { get; } = [];

        public Task AddAsync(Collection collection, CancellationToken cancellationToken)
        {
            Collections.Add(collection);
            return Task.CompletedTask;
        }

        public Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, Guid ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult(Collections.SingleOrDefault(collection =>
                collection.Id == collectionId && collection.OwnerId == ownerId));
        }

        public Task<IReadOnlyList<Collection>> ListByOwnerAsync(Guid ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<Collection>>(Collections.Where(collection => collection.OwnerId == ownerId).ToArray());
        }
    }
}
