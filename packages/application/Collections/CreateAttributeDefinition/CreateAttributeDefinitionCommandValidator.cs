using FluentValidation;

namespace CurateDS.Application.Collections.CreateAttributeDefinition;

public sealed class CreateAttributeDefinitionCommandValidator : AbstractValidator<CreateAttributeDefinitionCommand>
{
    public CreateAttributeDefinitionCommandValidator()
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
            .Must(name => name.Trim().Length <= 60)
            .WithMessage("'Name' must be 60 characters or fewer.");
    }
}
