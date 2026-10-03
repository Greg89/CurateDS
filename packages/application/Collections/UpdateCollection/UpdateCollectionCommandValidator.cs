using CurateDS.Application.Collections.Shared;
using FluentValidation;

namespace CurateDS.Application.Collections.UpdateCollection;

public sealed class UpdateCollectionCommandValidator : CollectionIdentityCommandValidator<UpdateCollectionCommand>
{
    public UpdateCollectionCommandValidator()
    {
        RuleFor(command => command.CollectionId).NotEmpty();
    }
}
