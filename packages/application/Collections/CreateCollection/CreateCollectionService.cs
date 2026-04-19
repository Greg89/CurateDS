using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Domain.Collections;
using FluentValidation;

namespace CurateDS.Application.Collections.CreateCollection;

public sealed class CreateCollectionService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IValidator<CreateCollectionCommand> _validator;

    public CreateCollectionService(
        ICollectionRepository collectionRepository,
        IValidator<CreateCollectionCommand> validator)
    {
        _collectionRepository = collectionRepository;
        _validator = validator;
    }

    public async Task<CreateCollectionResult> ExecuteAsync(
        CreateCollectionCommand command,
        CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var collection = Collection.Create(command.OwnerId, command.Name, DateTime.UtcNow);

        await _collectionRepository.AddAsync(collection, cancellationToken);

        return new CreateCollectionResult(collection.Id, collection.Name, collection.CreatedUtc);
    }
}
