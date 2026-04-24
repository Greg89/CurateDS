using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;
using FluentValidation;
using FluentValidation.Results;

namespace CurateDS.Application.Collections.Shared;

internal static class ItemOrganizationValidator
{
    public static async Task<(Location? Location, IReadOnlyList<Tag> Tags)> ValidateAsync(
        Guid ownerId,
        Guid? locationId,
        IReadOnlyList<Guid> tagIds,
        ILocationRepository locationRepository,
        ITagRepository tagRepository,
        CancellationToken cancellationToken)
    {
        var failures = new List<ValidationFailure>();
        Location? location = null;

        if (locationId.HasValue)
        {
            location = await locationRepository.GetByIdAndOwnerAsync(locationId.Value, ownerId, cancellationToken);

            if (location is null)
            {
                failures.Add(new ValidationFailure("LocationId", "Location must belong to the current owner."));
            }
        }

        var tags = tagIds.Count == 0
            ? []
            : await tagRepository.ListByIdsAsync(ownerId, tagIds, cancellationToken);

        if (tags.Count != tagIds.Distinct().Count())
        {
            failures.Add(new ValidationFailure("TagIds", "Tags must belong to the current owner."));
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        return (location, tags);
    }

    public static IReadOnlyList<ItemTag> BuildItemTags(Guid itemId, IReadOnlyList<Tag> tags)
    {
        return tags
            .OrderBy(tag => tag.Name)
            .Select(tag => ItemTag.Create(itemId, tag.Id))
            .ToArray();
    }
}
