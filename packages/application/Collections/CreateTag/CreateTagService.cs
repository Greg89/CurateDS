using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.CreateTag;

public sealed class CreateTagService
{
    private readonly ITagRepository _tagRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateTagCommand> _validator;

    public CreateTagService(
        ITagRepository tagRepository,
        ICatalogUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IValidator<CreateTagCommand> validator)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<CreateTagResult> ExecuteAsync(CreateTagCommand command, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var tag = Tag.Create(command.OwnerId, command.Name, DateTime.UtcNow, _currentUser.GetCurrentUser());

        if (await _tagRepository.ExistsByKeyAsync(command.OwnerId, tag.Key, cancellationToken))
        {
            throw new ValidationException([
                new ValidationFailure(nameof(CreateTagCommand.Name), "A tag with this name already exists.")
                {
                    ErrorCode = "duplicate_tag"
                }
            ]);
        }

        await _unitOfWork.ExecuteInTransactionAsync(
            innerCancellationToken => _tagRepository.AddAsync(tag, innerCancellationToken),
            cancellationToken);

        return new CreateTagResult(tag.Id, tag.Name, tag.Key, tag.CreatedUtc);
    }
}
