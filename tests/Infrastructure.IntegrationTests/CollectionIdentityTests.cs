using CurateDS.Domain.Collections;
using CurateDS.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class CollectionIdentityTests
{
    [Fact]
    public async Task Identity_ShouldRoundTripAlongsideCollectionsWithoutIdentity()
    {
        await using var database = await TransactionTestDatabase.OpenAsync();
        var legacy = Collection.Create("owner", "Existing collection", DateTime.UtcNow, "owner");
        var personal = Collection.Create("owner", "Reading room", DateTime.UtcNow, "owner",
            "Books", "Stories worth keeping", "https://images.example/cover.jpg", "slate");
        await using (var write = new CatalogDbContext(database.Options))
        {
            await database.InitializeAsync(write);
            write.Collections.AddRange(legacy, personal);
            await write.SaveChangesAsync();
        }
        await using var read = new CatalogDbContext(database.Options);
        var saved = await read.Collections.SingleAsync(c => c.Id == personal.Id);
        saved.Category.Should().Be(personal.Category);
        saved.Description.Should().Be(personal.Description);
        saved.CoverImageUrl.Should().Be(personal.CoverImageUrl);
        saved.Color.Should().Be(personal.Color);
        (await read.Collections.SingleAsync(c => c.Id == legacy.Id)).Category.Should().BeNull();
    }
}
