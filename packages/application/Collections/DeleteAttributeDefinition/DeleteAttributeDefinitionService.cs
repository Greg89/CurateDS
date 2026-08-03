using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteAttributeDefinition;

public sealed class DeleteAttributeDefinitionService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly ICatalogUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public DeleteAttributeDefinitionService(
        ICollectionRepository collectionRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository,
        ICatalogUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _collectionRepository = collectionRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task ExecuteAsync(DeleteAttributeDefinitionCommand command, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            command.CollectionId,
            command.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        await _unitOfWork.ExecuteInTransactionAsync(
            async innerCancellationToken =>
            {
                var deleted = await _attributeDefinitionRepository.SoftDeleteAsync(
                    command.AttributeDefinitionId,
                    command.CollectionId,
                    now,
                    actor,
                    innerCancellationToken);

                if (!deleted)
                {
                    throw new NotFoundException("Attribute definition was not found.");
                }
            },
            cancellationToken);
    }
}
