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
            .NotEmpty()
            .Length(2, 50);
    }
}
