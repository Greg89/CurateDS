using FluentValidation;

namespace CurateDS.Application.Collections.CreateLocation;

public sealed class CreateLocationCommandValidator : AbstractValidator<CreateLocationCommand>
{
    public CreateLocationCommandValidator()
    {
        RuleFor(command => command.OwnerId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("'Name' must not be empty.")
            .Must(name => name.Trim().Length >= 2)
            .WithMessage("'Name' must be at least 2 characters long.")
            .MaximumLength(80);

        RuleFor(command => command.Description)
            .MaximumLength(240)
            .When(command => !string.IsNullOrWhiteSpace(command.Description));
    }
}
