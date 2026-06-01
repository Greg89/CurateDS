using FluentValidation;

namespace CurateDS.Application.Collections.UpdateTag;

public sealed class UpdateTagCommandValidator : AbstractValidator<UpdateTagCommand>
{
    public UpdateTagCommandValidator()
    {
        RuleFor(command => command.OwnerId)
            .NotEmpty();

        RuleFor(command => command.TagId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("'Name' must not be empty.")
            .Must(name => name.Trim().Length >= 2)
            .WithMessage("'Name' must be at least 2 characters long.")
            .MaximumLength(50);
    }
}
