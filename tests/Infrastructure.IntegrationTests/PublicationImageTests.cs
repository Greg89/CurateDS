using CurateDS.Application.Publications;
using CurateDS.Infrastructure.Publications;
using FluentAssertions;
using SkiaSharp;

namespace CurateDS.Infrastructure.IntegrationTests;

public sealed class PublicationImageTests
{
    [Fact]
    public void Derivatives_DecodeBoundDimensionsAndReencodeWithoutSourceMetadata()
    {
        using var bitmap = new SKBitmap(2400, 1200);
        using (var canvas = new SKCanvas(bitmap)) canvas.Clear(SKColors.Coral);
        using var original = SKImage.FromBitmap(bitmap); using var png = original.Encode(SKEncodedImageFormat.Png, 100);
        // A trailing source sentinel must not survive decoding/re-encoding.
        var source = png.ToArray().Concat(System.Text.Encoding.UTF8.GetBytes("PRIVATE_FILENAME_EXIF_SENTINEL")).ToArray();
        var bytes = new PublicationImageProcessor().Convert(source);
        bytes.Length.Should().BeLessThanOrEqualTo(PublicationImageProcessor.MaximumBytes);
        System.Text.Encoding.UTF8.GetString(bytes).Should().NotContain("PRIVATE_FILENAME_EXIF_SENTINEL");
        using var decoded = SKBitmap.Decode(bytes); decoded.Width.Should().Be(1600); decoded.Height.Should().Be(800);
    }
    [Fact]
    public void CameraOrientation_IsAppliedBeforeMetadataIsRemoved()
    {
        using var bitmap = new SKBitmap(40, 20); bitmap.Erase(SKColors.Coral);
        using var original = SKImage.FromBitmap(bitmap); using var jpeg = original.Encode(SKEncodedImageFormat.Jpeg, 90);
        byte[] orientation = [255, 225, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0,
            1, 0, 18, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0];
        var encoded = jpeg.ToArray(); var source = encoded.Take(2).Concat(orientation).Concat(encoded.Skip(2)).ToArray();
        using var result = SKBitmap.Decode(new PublicationImageProcessor().Convert(source));
        result.Width.Should().Be(20); result.Height.Should().Be(40);
    }
    [Fact]
    public void InvalidAndOversizedImages_AreRejectedBeforePixelAllocation()
    {
        var processor = new PublicationImageProcessor();
        var invalid = () => processor.Convert(System.Text.Encoding.UTF8.GetBytes("<svg><script>bad</script></svg>"));
        invalid.Should().Throw<PublicationMediaException>();
        // A valid GIF header advertises 65535 by 65535 pixels without allocating them.
        byte[] bomb = [71, 73, 70, 56, 57, 97, 255, 255, 255, 255, 128, 0, 0, 0, 0, 0, 255, 255, 255, 59];
        var oversized = () => processor.Convert(bomb); oversized.Should().Throw<PublicationMediaException>();
    }
}
