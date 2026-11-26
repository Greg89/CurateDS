using FluentValidation;

namespace CurateDS.Application.Collections.CollectionPresentation;

public sealed class UpdateCollectionPresentationValidator : AbstractValidator<UpdateCollectionPresentationCommand>
{
    public UpdateCollectionPresentationValidator()
    {
        RuleFor(command => command.OwnerId).NotEmpty();
        RuleFor(command => command.CollectionId).NotEmpty();
        RuleFor(command => command.PinnedItemIds).Cascade(CascadeMode.Stop).NotNull()
            .Must(ids => ids.Count <= 6 && ids.All(id => id != Guid.Empty) && ids.Distinct().Count() == ids.Count)
            .WithMessage("Choose up to six different items.");
    }
}
