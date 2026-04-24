using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using FluentValidation;

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
        await _tagRepository.AddAsync(tag, cancellationToken);

        return new CreateTagResult(tag.Id, tag.Name, tag.Key, tag.CreatedUtc);
    }
}
