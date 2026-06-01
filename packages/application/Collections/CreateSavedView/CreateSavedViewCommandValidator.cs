using FluentValidation;

namespace CurateDS.Application.Collections.CreateSavedView;

public sealed class CreateSavedViewCommandValidator : AbstractValidator<CreateSavedViewCommand>
{
    public CreateSavedViewCommandValidator()
    {
        RuleFor(command => command.OwnerId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("'Name' must not be empty.")
            .MaximumLength(100);

        RuleFor(command => command.FiltersJson)
            .NotEmpty()
            .Must(BeValidJson)
            .WithMessage("'FiltersJson' must be a valid JSON string.");
    }

    private static bool BeValidJson(string? value)
    {
        if (value is null) return false;
        try
        {
            System.Text.Json.JsonDocument.Parse(value);
            return true;
        }
        catch (System.Text.Json.JsonException)
        {
            return false;
        }
    }
}
