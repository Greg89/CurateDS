using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;

namespace CurateDS.Application.Collections.CreateAttributeDefinition;

public sealed class CreateAttributeDefinitionService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateAttributeDefinitionCommand> _validator;

    public CreateAttributeDefinitionService(
        ICollectionRepository collectionRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository,
        ICurrentUserService currentUser,
        IValidator<CreateAttributeDefinitionCommand> validator)
    {
        _collectionRepository = collectionRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<CreateAttributeDefinitionResult> ExecuteAsync(
        CreateAttributeDefinitionCommand command,
        CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            command.CollectionId,
            command.OwnerId,
            cancellationToken);

        if (collection is null)
        {
            throw new NotFoundException("Collection was not found.");
        }

        var sortOrder = await _attributeDefinitionRepository.GetNextSortOrderAsync(command.CollectionId, cancellationToken);

        var attributeDefinition = AttributeDefinition.Create(
            command.CollectionId,
            command.Name,
            command.DataType,
            command.IsRequired,
            command.IsFilterable,
            sortOrder,
            DateTime.UtcNow,
            _currentUser.GetCurrentUser());

        await _attributeDefinitionRepository.AddAsync(attributeDefinition, cancellationToken);

        return new CreateAttributeDefinitionResult(
            attributeDefinition.Id,
            attributeDefinition.CollectionId,
            attributeDefinition.Name,
            attributeDefinition.Key,
            attributeDefinition.DataType,
            attributeDefinition.IsRequired,
            attributeDefinition.IsFilterable,
            attributeDefinition.SortOrder,
            attributeDefinition.CreatedUtc);
    }
}
