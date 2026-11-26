using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Collections.UploadItemMedia;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.ReadItemMedia;

public sealed record ItemMediaContent(byte[] Bytes, string ContentType);

public sealed class ReadItemMediaService(ICollectionRepository collections, IItemRepository items, IMediaStorageService storage)
{
    public async Task<ItemMediaContent> ExecuteAsync(string ownerId, Guid collectionId, Guid itemId, Guid assetId, CancellationToken ct)
    {
        if (await collections.GetByIdAndOwnerAsync(collectionId, ownerId, ct) is null)
            throw new NotFoundException("Media asset was not found.");
        var item = await items.GetByIdAsync(itemId, collectionId, ct)
            ?? throw new NotFoundException("Media asset was not found.");
        var asset = item.MediaAssets.SingleOrDefault(a => a.Id == assetId && a.CollectionId == collectionId && a.ItemId == itemId)
            ?? throw new NotFoundException("Media asset was not found.");
        var contentType = asset.ContentType.ToLowerInvariant();
        if (contentType is not ("image/jpeg" or "image/png" or "image/gif" or "image/webp") ||
            asset.SizeBytes is <= 0 or > UploadItemMediaService.MaxFileSizeBytes)
            throw new InvalidDataException("Invalid media metadata.");
        var bytes = await storage.ReadAsync(asset.StorageKey, asset.SizeBytes, ct)
            ?? throw new NotFoundException("Media asset was not found.");
        if (bytes.LongLength != asset.SizeBytes) throw new InvalidDataException("Media length mismatch.");
        return new(bytes, contentType);
    }
}
