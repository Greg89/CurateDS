namespace CurateDS.Domain.Collections;

public sealed class MediaAsset
{
    // Parameterless constructor for EF Core materialization.
    private MediaAsset()
    {
        StorageKey = null!;
        ContentType = null!;
        FileName = null!;
    }

    private MediaAsset(
        Guid id,
        Guid itemId,
        Guid collectionId,
        string storageKey,
        string contentType,
        string fileName,
        long sizeBytes,
        bool isPrimary,
        DateTime uploadedUtc)
    {
        Id = id;
        ItemId = itemId;
        CollectionId = collectionId;
        StorageKey = storageKey;
        ContentType = contentType;
        FileName = fileName;
        SizeBytes = sizeBytes;
        IsPrimary = isPrimary;
        UploadedUtc = uploadedUtc;
    }

    public Guid Id { get; private set; }

    public Guid ItemId { get; private set; }

    public Guid CollectionId { get; private set; }

    public string StorageKey { get; private set; }

    public string ContentType { get; private set; }

    public string FileName { get; private set; }

    public long SizeBytes { get; private set; }

    public bool IsPrimary { get; private set; }

    public DateTime UploadedUtc { get; private set; }

    public static MediaAsset Create(
        Guid itemId,
        Guid collectionId,
        string storageKey,
        string contentType,
        string fileName,
        long sizeBytes,
        DateTime uploadedUtc)
    {
        if (itemId == Guid.Empty)
        {
            throw new ArgumentException("Item ID is required.", nameof(itemId));
        }

        if (collectionId == Guid.Empty)
        {
            throw new ArgumentException("Collection ID is required.", nameof(collectionId));
        }

        if (string.IsNullOrWhiteSpace(storageKey))
        {
            throw new ArgumentException("Storage key is required.", nameof(storageKey));
        }

        if (string.IsNullOrWhiteSpace(contentType))
        {
            throw new ArgumentException("Content type is required.", nameof(contentType));
        }

        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new ArgumentException("File name is required.", nameof(fileName));
        }

        return new MediaAsset(
            Guid.NewGuid(),
            itemId,
            collectionId,
            storageKey.Trim(),
            contentType.Trim(),
            fileName.Trim(),
            sizeBytes,
            isPrimary: false,
            uploadedUtc);
    }

    /// <summary>
    /// Sets the primary flag. Only callable within the domain assembly via Item aggregate methods.
    /// </summary>
    internal void SetPrimary(bool isPrimary)
    {
        IsPrimary = isPrimary;
    }
}
