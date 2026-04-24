using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.CreateTag;

public sealed class CreateTagService
{
    private readonly ITagRepository _tagRepository;
    private readonly IValidator<CreateTagCommand> _validator;

    public CreateTagService(ITagRepository tagRepository, IValidator<CreateTagCommand> validator)
    {
        _tagRepository = tagRepository;
        _validator = validator;
    }

    public async Task<CreateTagResult> ExecuteAsync(CreateTagCommand command, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var tag = Tag.Create(command.OwnerId, command.Name, DateTime.UtcNow);

        if (await _tagRepository.ExistsByKeyAsync(command.OwnerId, tag.Key, cancellationToken))
        {
            throw new ValidationException([
                new ValidationFailure(nameof(CreateTagCommand.Name), "A tag with this name already exists.")
            ]);
        }

        await _tagRepository.AddAsync(tag, cancellationToken);

        return new CreateTagResult(tag.Id, tag.Name, tag.Key, tag.CreatedUtc);
    }
}
