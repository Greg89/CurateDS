using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class MediaAssetTests
{
    [Fact]
    public void Create_ShouldSetAllProperties()
    {
        var itemId = Guid.NewGuid();
        var collectionId = Guid.NewGuid();
        var uploadedUtc = new DateTime(2026, 4, 26, 12, 0, 0, DateTimeKind.Utc);

        var asset = MediaAsset.Create(
            itemId,
            collectionId,
            "beta/collections/abc/items/xyz/f3a1.jpg",
            "image/jpeg",
            "photo.jpg",
            204800,
            uploadedUtc);

        asset.Id.Should().NotBeEmpty();
        asset.ItemId.Should().Be(itemId);
        asset.CollectionId.Should().Be(collectionId);
        asset.StorageKey.Should().Be("beta/collections/abc/items/xyz/f3a1.jpg");
        asset.ContentType.Should().Be("image/jpeg");
        asset.FileName.Should().Be("photo.jpg");
        asset.SizeBytes.Should().Be(204800);
        asset.IsPrimary.Should().BeFalse();
        asset.UploadedUtc.Should().Be(uploadedUtc);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_ShouldThrow_WhenStorageKeyIsEmpty(string key)
    {
        var act = () => MediaAsset.Create(
            Guid.NewGuid(), Guid.NewGuid(), key, "image/jpeg", "photo.jpg", 1024, DateTime.UtcNow);

        act.Should().Throw<ArgumentException>().WithParameterName("storageKey");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_ShouldThrow_WhenContentTypeIsEmpty(string contentType)
    {
        var act = () => MediaAsset.Create(
            Guid.NewGuid(), Guid.NewGuid(), "some/key.jpg", contentType, "photo.jpg", 1024, DateTime.UtcNow);

        act.Should().Throw<ArgumentException>().WithParameterName("contentType");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_ShouldThrow_WhenFileNameIsEmpty(string fileName)
    {
        var act = () => MediaAsset.Create(
            Guid.NewGuid(), Guid.NewGuid(), "some/key.jpg", "image/jpeg", fileName, 1024, DateTime.UtcNow);

        act.Should().Throw<ArgumentException>().WithParameterName("fileName");
    }

    [Fact]
    public void Create_ShouldThrow_WhenItemIdIsEmpty()
    {
        var act = () => MediaAsset.Create(
            Guid.Empty, Guid.NewGuid(), "some/key.jpg", "image/jpeg", "photo.jpg", 1024, DateTime.UtcNow);

        act.Should().Throw<ArgumentException>().WithParameterName("itemId");
    }

    [Fact]
    public void Create_ShouldThrow_WhenCollectionIdIsEmpty()
    {
        var act = () => MediaAsset.Create(
            Guid.NewGuid(), Guid.Empty, "some/key.jpg", "image/jpeg", "photo.jpg", 1024, DateTime.UtcNow);

        act.Should().Throw<ArgumentException>().WithParameterName("collectionId");
    }
}
