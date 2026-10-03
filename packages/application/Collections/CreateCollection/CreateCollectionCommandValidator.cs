using FluentValidation;

namespace CurateDS.Application.Collections.CreateCollection;

public sealed class CreateCollectionCommandValidator : AbstractValidator<CreateCollectionCommand>
{
    public CreateCollectionCommandValidator()
    {
        RuleFor(command => command.OwnerId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .Cascade(CascadeMode.Stop)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("'Name' must not be empty.")
            .Must(name => name.Trim().Length >= 3)
            .WithMessage("'Name' must be at least 3 characters long.")
            .MaximumLength(100);

        RuleFor(command => command.Category).MaximumLength(100);
        RuleFor(command => command.Description).MaximumLength(1000);
        RuleFor(command => command.CoverImageUrl).MaximumLength(2048)
            .Must(CurateDS.Domain.Collections.Collection.IsValidCoverImageUrl)
            .WithMessage("Cover image must be an HTTPS URL without credentials.");
        RuleFor(command => command.Color)
            .Must(value => value is null or "" or "forest" or "clay" or "slate")
            .WithMessage("Choose forest, clay, or slate.");
    }
}
