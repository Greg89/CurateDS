namespace CurateDS.Application.Abstractions;

/// <summary>
/// Provides object storage operations for item media assets.
/// The key format and environment prefix are managed by the implementation.
/// </summary>
public interface IMediaStorageService
{
    /// <summary>
    /// Uploads content to object storage and returns the storage key.
    /// The key format is: {environment}/collections/{collectionId}/items/{itemId}/{uuid}.{ext}
    /// </summary>
    Task<string> UploadAsync(
        Guid collectionId,
        Guid itemId,
        Stream content,
        string contentType,
        string fileExtension,
        CancellationToken cancellationToken);

    /// <summary>
    /// Deletes an object from storage by its key. Best-effort: does not throw if the object is missing.
    /// </summary>
    Task DeleteAsync(string storageKey, CancellationToken cancellationToken);

    /// <summary>
    /// Reads a private object with a strict byte limit; returns null only when it does not exist.
    /// </summary>
    Task<byte[]?> ReadAsync(string storageKey, long maximumBytes, CancellationToken cancellationToken);
}
