using CurateDS.Application.Abstractions;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;

namespace CurateDS.Application.Collections.DeleteTag;

public sealed class DeleteTagService
{
    private readonly ITagRepository _tagRepository;
    private readonly ICurrentUserService _currentUser;

    public DeleteTagService(ITagRepository tagRepository, ICurrentUserService currentUser)
    {
        _tagRepository = tagRepository;
        _currentUser = currentUser;
    }

    public async Task ExecuteAsync(DeleteTagCommand command, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var actor = _currentUser.GetCurrentUser();

        var deleted = await _tagRepository.SoftDeleteAsync(
            command.TagId,
            command.OwnerId,
            now,
            actor,
            cancellationToken);

        if (!deleted)
        {
            throw new NotFoundException("Tag was not found.");
        }
    }
}
