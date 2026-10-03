using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using FluentValidation;

namespace CurateDS.Application.Collections.UpdateCollection;

public sealed class UpdateCollectionService(
    ICollectionRepository collections,
    ICatalogUnitOfWork unitOfWork,
    ICurrentUserService currentUser,
    IValidator<UpdateCollectionCommand> validator)
{
    public async Task<CollectionDto> ExecuteAsync(UpdateCollectionCommand command, CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(command, cancellationToken);
        var collection = await collections.GetByIdAndOwnerAsync(command.CollectionId, command.OwnerId, cancellationToken)
            ?? throw new NotFoundException("Collection was not found.");

        return await unitOfWork.ExecuteInTransactionAsync(innerCancellationToken =>
        {
            collection.UpdateIdentity(command.Name, command.Category, command.Description, command.CoverImageUrl,
                command.Color, DateTime.UtcNow, currentUser.GetCurrentUser());
            return Task.FromResult(new CollectionDto(collection.Id, collection.Name, collection.CreatedUtc,
                collection.Category, collection.Description, collection.CoverImageUrl, collection.Color));
        }, cancellationToken);
    }
}
