using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;

namespace CurateDS.Application.Collections.UploadItemMedia;

public sealed class UploadItemMediaService
{
    public const long MaxFileSizeBytes = 20 * 1024 * 1024; // 20 MB

    private static readonly IReadOnlyDictionary<string, string> AllowedContentTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = "jpg",
            ["image/png"] = "png",
            ["image/webp"] = "webp",
            ["image/gif"] = "gif"
        };

    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IMediaStorageService _mediaStorageService;
    private readonly ICurrentUserService _currentUserService;

    public UploadItemMediaService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        IMediaStorageService mediaStorageService,
        ICurrentUserService currentUserService)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _mediaStorageService = mediaStorageService;
        _currentUserService = currentUserService;
    }

    public async Task<MediaAssetDto> ExecuteAsync(
        UploadItemMediaCommand command,
        CancellationToken cancellationToken)
    {
        ValidateCommand(command);

        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            command.CollectionId,
            command.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        var item = await _itemRepository.GetByIdAsync(
            command.ItemId,
            command.CollectionId,
            cancellationToken);

        if (item is null)
        {
            throw new NotFoundException("Item was not found.");
        }

        var fileExtension = AllowedContentTypes[command.ContentType];
        var uploadedUtc = DateTime.UtcNow;

        var storageKey = await _mediaStorageService.UploadAsync(
            command.CollectionId,
            command.ItemId,
            command.Content,
            command.ContentType,
            fileExtension,
            cancellationToken);

        var asset = MediaAsset.Create(
            item.Id,
            item.CollectionId,
            storageKey,
            command.ContentType,
            command.FileName,
            command.SizeBytes,
            uploadedUtc);

        item.AddMedia(asset);
        _itemRepository.AddMediaAsset(asset); // explicitly register as Added — EF can't infer this for new entities with non-default Guid keys

        await _itemRepository.SaveChangesAsync(cancellationToken);

        return new MediaAssetDto(
            asset.Id,
            _mediaStorageService.GetPublicUrl(storageKey),
            asset.ContentType,
            asset.FileName,
            asset.SizeBytes,
            asset.IsPrimary,
            asset.UploadedUtc);
    }

    private static void ValidateCommand(UploadItemMediaCommand command)
    {
        var failures = new List<FluentValidation.Results.ValidationFailure>();

        if (!AllowedContentTypes.ContainsKey(command.ContentType))
        {
            failures.Add(new FluentValidation.Results.ValidationFailure(
                nameof(command.ContentType),
                $"Content type '{command.ContentType}' is not allowed. Accepted types: {string.Join(", ", AllowedContentTypes.Keys)}."));
        }

        if (command.SizeBytes > MaxFileSizeBytes)
        {
            failures.Add(new FluentValidation.Results.ValidationFailure(
                nameof(command.SizeBytes),
                $"File size {command.SizeBytes:N0} bytes exceeds the maximum allowed size of {MaxFileSizeBytes:N0} bytes (20 MB)."));
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }
    }
}
