using CurateDS.Application.Abstractions.Persistence;

namespace CurateDS.Application.Collections.ListTags;

public sealed class ListTagsService
{
    private readonly ITagRepository _tagRepository;

    public ListTagsService(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<IReadOnlyList<TagDto>> ExecuteAsync(ListTagsQuery query, CancellationToken cancellationToken)
    {
        var tags = await _tagRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);

        return tags
            .Select(tag => new TagDto(tag.Id, tag.Name, tag.Key, tag.CreatedUtc))
            .ToArray();
    }
}
