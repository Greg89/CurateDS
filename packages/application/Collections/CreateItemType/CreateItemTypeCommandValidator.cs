using FluentValidation;

namespace CurateDS.Application.Collections.CreateItemType;

public sealed class CreateItemTypeCommandValidator : AbstractValidator<CreateItemTypeCommand>
{
    public CreateItemTypeCommandValidator()
    {
        RuleFor(command => command.OwnerId)
            .NotEmpty();

        RuleFor(command => command.CollectionId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("'Name' must not be empty.")
            .Must(name => name.Trim().Length >= 2)
            .WithMessage("'Name' must be at least 2 characters long.")
            .Must(name => name.Trim().Length <= 50)
            .WithMessage("'Name' must be 50 characters or fewer.");
    }
}
