using FluentValidation;

namespace CurateDS.Application.Collections.CreateCollection;

public sealed class CreateCollectionCommandValidator : AbstractValidator<CreateCollectionCommand>
{
    public CreateCollectionCommandValidator()
    {
        RuleFor(command => command.OwnerId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .NotEmpty()
            .MinimumLength(3)
            .MaximumLength(100);
    }
}
