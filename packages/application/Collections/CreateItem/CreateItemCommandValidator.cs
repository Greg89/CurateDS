using FluentValidation;

namespace CurateDS.Application.Collections.CreateItem;

public sealed class CreateItemCommandValidator : AbstractValidator<CreateItemCommand>
{
    public CreateItemCommandValidator()
    {
        RuleFor(command => command.OwnerId)
            .NotEmpty();

        RuleFor(command => command.CollectionId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("'Name' must not be empty.")
            .Must(name => name.Trim().Length >= 3)
            .WithMessage("'Name' must be at least 3 characters long.")
            .MaximumLength(120);

        RuleFor(command => command.Description)
            .MaximumLength(2000)
            .When(command => !string.IsNullOrWhiteSpace(command.Description));

        RuleFor(command => command.Quantity)
            .InclusiveBetween(1, 9999);

        RuleFor(command => command.TagIds)
            .Must(tagIds => tagIds.Distinct().Count() == tagIds.Count)
            .WithMessage("Tag IDs must not contain duplicates.");

        RuleFor(command => command.AttributeValues)
            .Must(HaveUniqueAttributeDefinitionIds)
            .WithMessage("Attribute values must not contain duplicate definitions.");

        RuleForEach(command => command.AttributeValues)
            .ChildRules(attribute =>
            {
                attribute.RuleFor(value => value.AttributeDefinitionId)
                    .NotEmpty();

                attribute.RuleFor(value => value.Value)
                    .Must(value => !string.IsNullOrWhiteSpace(value))
                    .WithMessage("'Value' must not be empty.");
            });
    }

    private static bool HaveUniqueAttributeDefinitionIds(IReadOnlyList<CreateItemAttributeValueInput> attributeValues)
    {
        return attributeValues
            .Select(attributeValue => attributeValue.AttributeDefinitionId)
            .Distinct()
            .Count() == attributeValues.Count;
    }
}
