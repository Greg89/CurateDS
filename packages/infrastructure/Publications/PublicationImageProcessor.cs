using CurateDS.Application.Publications;
using SkiaSharp;

namespace CurateDS.Infrastructure.Publications;

public sealed class PublicationImageProcessor : IPublicationImageProcessor
{
    public const int MaximumPixels = 20_000_000;
    public const int MaximumBytes = 1024 * 1024;

    public byte[] Convert(byte[] source)
    {
        if (source.Length is 0 or > 20 * 1024 * 1024) throw new PublicationMediaException();
        using var data = SKData.CreateCopy(source);
        using var codec = SKCodec.Create(data);
        if (codec is null || codec.EncodedFormat is not (SKEncodedImageFormat.Jpeg or SKEncodedImageFormat.Png or SKEncodedImageFormat.Webp or SKEncodedImageFormat.Gif) ||
            codec.Info.Width <= 0 || codec.Info.Height <= 0 || (long)codec.Info.Width * codec.Info.Height > MaximumPixels)
            throw new PublicationMediaException();
        // Decode only the first frame into a fixed 4-byte pixel format after checking dimensions.
        using var decoded = new SKBitmap(new SKImageInfo(codec.Info.Width, codec.Info.Height, SKColorType.Rgba8888, SKAlphaType.Premul));
        if (codec.GetPixels(decoded.Info, decoded.GetPixels()) != SKCodecResult.Success) throw new PublicationMediaException();
        var ratio = Math.Min(1d, 1600d / Math.Max(decoded.Width, decoded.Height));
        var rotated = codec.EncodedOrigin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var width = Math.Max(1, (int)((rotated ? decoded.Height : decoded.Width) * ratio));
        var height = Math.Max(1, (int)((rotated ? decoded.Width : decoded.Height) * ratio));
        // A fresh raster drops source EXIF, text chunks, file names, animation, and colour profiles.
        for (var attempt = 0; attempt < 4; attempt++)
        {
            using var raster = new SKBitmap(width, height);
            using (var canvas = new SKCanvas(raster))
            {
                canvas.Clear(SKColors.White);
                canvas.Scale((float)width / (rotated ? decoded.Height : decoded.Width), (float)height / (rotated ? decoded.Width : decoded.Height));
                switch (codec.EncodedOrigin)
                {
                    case SKEncodedOrigin.TopRight: canvas.Translate(decoded.Width, 0); canvas.Scale(-1, 1); break;
                    case SKEncodedOrigin.BottomRight: canvas.Translate(decoded.Width, decoded.Height); canvas.RotateDegrees(180); break;
                    case SKEncodedOrigin.BottomLeft: canvas.Translate(0, decoded.Height); canvas.Scale(1, -1); break;
                    case SKEncodedOrigin.LeftTop: canvas.RotateDegrees(90); canvas.Scale(1, -1); break;
                    case SKEncodedOrigin.RightTop: canvas.Translate(decoded.Height, 0); canvas.RotateDegrees(90); break;
                    case SKEncodedOrigin.RightBottom: canvas.Translate(decoded.Height, decoded.Width); canvas.RotateDegrees(90); canvas.Scale(-1, 1); break;
                    case SKEncodedOrigin.LeftBottom: canvas.Translate(0, decoded.Width); canvas.RotateDegrees(270); break;
                }
                canvas.DrawBitmap(decoded, new SKRect(0, 0, decoded.Width, decoded.Height), new SKSamplingOptions(SKFilterMode.Linear));
            }
            using var image = SKImage.FromBitmap(raster);
            using var encoded = image.Encode(SKEncodedImageFormat.Jpeg, 82);
            if (encoded is not null && encoded.Size <= MaximumBytes) return encoded.ToArray();
            width = Math.Max(1, width * 3 / 4); height = Math.Max(1, height * 3 / 4);
        }
        throw new PublicationMediaException();
    }
}
