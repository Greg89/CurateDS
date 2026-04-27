using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class ItemMediaTests
{
    private static Item CreateItem()
    {
        return Item.Create(Guid.NewGuid(), "Camera", null, 1, DateTime.UtcNow, "system");
    }

    private static MediaAsset CreateAsset(Guid itemId, Guid collectionId, DateTime? uploadedUtc = null)
    {
        return MediaAsset.Create(
            itemId,
            collectionId,
            $"beta/collections/{collectionId}/items/{itemId}/{Guid.NewGuid()}.jpg",
            "image/jpeg",
            "photo.jpg",
            1024,
            uploadedUtc ?? DateTime.UtcNow);
    }

    [Fact]
    public void AddMedia_ShouldMakeFirstAssetPrimary()
    {
        var item = CreateItem();
        var asset = CreateAsset(item.Id, item.CollectionId);

        item.AddMedia(asset);

        item.MediaAssets.Should().HaveCount(1);
        item.MediaAssets[0].IsPrimary.Should().BeTrue();
    }

    [Fact]
    public void AddMedia_ShouldNotMakeSubsequentAssetPrimary()
    {
        var item = CreateItem();
        var first = CreateAsset(item.Id, item.CollectionId);
        var second = CreateAsset(item.Id, item.CollectionId);

        item.AddMedia(first);
        item.AddMedia(second);

        item.MediaAssets.Should().HaveCount(2);
        item.MediaAssets.Count(a => a.IsPrimary).Should().Be(1);
        first.IsPrimary.Should().BeTrue();
        second.IsPrimary.Should().BeFalse();
    }

    [Fact]
    public void SetPrimaryMedia_ShouldTransferPrimaryFlag()
    {
        var item = CreateItem();
        var first = CreateAsset(item.Id, item.CollectionId);
        var second = CreateAsset(item.Id, item.CollectionId);

        item.AddMedia(first);
        item.AddMedia(second);
        item.SetPrimaryMedia(second.Id);

        first.IsPrimary.Should().BeFalse();
        second.IsPrimary.Should().BeTrue();
    }

    [Fact]
    public void SetPrimaryMedia_ShouldBeIdempotent_WhenAlreadyPrimary()
    {
        var item = CreateItem();
        var asset = CreateAsset(item.Id, item.CollectionId);

        item.AddMedia(asset);
        item.SetPrimaryMedia(asset.Id);

        asset.IsPrimary.Should().BeTrue();
        item.MediaAssets.Count(a => a.IsPrimary).Should().Be(1);
    }

    [Fact]
    public void SetPrimaryMedia_ShouldThrow_WhenAssetNotFound()
    {
        var item = CreateItem();

        var act = () => item.SetPrimaryMedia(Guid.NewGuid());

        act.Should().Throw<ArgumentException>().WithParameterName("mediaAssetId");
    }

    [Fact]
    public void RemoveMedia_ShouldRemoveOnlyAsset()
    {
        var item = CreateItem();
        var asset = CreateAsset(item.Id, item.CollectionId);

        item.AddMedia(asset);
        item.RemoveMedia(asset.Id);

        item.MediaAssets.Should().BeEmpty();
    }

    [Fact]
    public void RemoveMedia_ShouldPromoteOldestAsset_WhenPrimaryIsRemoved()
    {
        var item = CreateItem();
        var baseTime = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var first = CreateAsset(item.Id, item.CollectionId, baseTime);
        var second = CreateAsset(item.Id, item.CollectionId, baseTime.AddSeconds(1));

        item.AddMedia(first);  // becomes primary
        item.AddMedia(second);
        item.RemoveMedia(first.Id);

        item.MediaAssets.Should().HaveCount(1);
        second.IsPrimary.Should().BeTrue();
    }

    [Fact]
    public void RemoveMedia_ShouldNotChangePrimary_WhenNonPrimaryIsRemoved()
    {
        var item = CreateItem();
        var first = CreateAsset(item.Id, item.CollectionId);
        var second = CreateAsset(item.Id, item.CollectionId);

        item.AddMedia(first);  // first is primary
        item.AddMedia(second);
        item.RemoveMedia(second.Id);

        item.MediaAssets.Should().HaveCount(1);
        first.IsPrimary.Should().BeTrue();
    }

    [Fact]
    public void RemoveMedia_ShouldThrow_WhenAssetNotFound()
    {
        var item = CreateItem();

        var act = () => item.RemoveMedia(Guid.NewGuid());

        act.Should().Throw<ArgumentException>().WithParameterName("mediaAssetId");
    }
}
