using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections;
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
        var unitOfWork = new FakeCatalogUnitOfWork();
        var service = new CreateCollectionService(
            repository,
            unitOfWork,
            new FakeCurrentUserService(),
            new CreateCollectionCommandValidator());
        var command = new CreateCollectionCommand("auth0|test-owner", "  Vinyl Records  ");

        var result = await service.ExecuteAsync(command, CancellationToken.None);

        result.Name.Should().Be("Vinyl Records");
        repository.Collections.Should().ContainSingle(collection => collection.Id == result.Id);
        unitOfWork.ExecutionCount.Should().Be(1);
    }

    private sealed class FakeCollectionRepository : ICollectionRepository
    {
        public List<Collection> Collections { get; } = [];

        public Task AddAsync(Collection collection, CancellationToken cancellationToken)
        {
            Collections.Add(collection);
            return Task.CompletedTask;
        }

        public Task<Collection?> GetByIdAndOwnerAsync(Guid collectionId, string ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult(Collections.SingleOrDefault(collection =>
                collection.Id == collectionId && collection.OwnerId == ownerId));
        }

        public Task<IReadOnlyList<Collection>> ListByOwnerAsync(string ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyList<Collection>>(Collections.Where(collection => collection.OwnerId == ownerId).ToArray());
        }

        public Task<bool> SoftDeleteAsync(Guid collectionId, string ownerId, DateTime deletedUtc, string deletedBy, CancellationToken cancellationToken)
            => Task.FromResult(false);

        public Task<CollectionSummaryDto> GetSummaryAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();

        public Task<CollectionReportsDto> GetReportsAsync(Guid collectionId, CancellationToken cancellationToken)
            => throw new NotImplementedException();
    }
}
