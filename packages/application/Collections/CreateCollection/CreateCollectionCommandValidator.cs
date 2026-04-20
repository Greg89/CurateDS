using FluentValidation;

namespace CurateDS.Application.Collections.CreateCollection;

public sealed class CreateCollectionCommandValidator : AbstractValidator<CreateCollectionCommand>
{
    public CreateCollectionCommandValidator()
    {
        RuleFor(command => command.OwnerId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("'Name' must not be empty.")
            .Must(name => name.Trim().Length >= 3)
            .WithMessage("'Name' must be at least 3 characters long.")
            .MaximumLength(100);
    }
}
