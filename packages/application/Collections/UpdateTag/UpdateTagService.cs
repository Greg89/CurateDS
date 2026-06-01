using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.UpdateTag;

public sealed class UpdateTagService
{
    private readonly ITagRepository _tagRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<UpdateTagCommand> _validator;

    public UpdateTagService(
        ITagRepository tagRepository,
        ICurrentUserService currentUser,
        IValidator<UpdateTagCommand> validator)
    {
        _tagRepository = tagRepository;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<UpdateTagResult> ExecuteAsync(UpdateTagCommand command, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var tag = await _tagRepository.GetByIdAndOwnerAsync(command.TagId, command.OwnerId, cancellationToken)
            ?? throw new NotFoundException("Tag was not found.");

        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        var originalKey = tag.Key;
        tag.Rename(command.Name, now, actor);

        if (tag.Key != originalKey
            && await _tagRepository.ExistsByKeyExcludingAsync(command.OwnerId, tag.Key, tag.Id, cancellationToken))
        {
            // The DbContext is scoped per request and disposed without saving when this exception bubbles,
            // so the in-memory mutation is harmless.
            throw new ValidationException([
                new ValidationFailure(nameof(UpdateTagCommand.Name), "A tag with this name already exists.")
                {
                    ErrorCode = "duplicate_tag"
                }
            ]);
        }

        await _tagRepository.SaveChangesAsync(cancellationToken);

        return new UpdateTagResult(tag.Id, tag.Name, tag.Key, tag.CreatedUtc, tag.UpdatedUtc);
    }
}
