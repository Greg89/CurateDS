namespace CurateDS.Application.Collections.Shared;

public interface ICollectionIdentityCommand
{
    string OwnerId { get; }
    string Name { get; }
    string? Category { get; }
    string? Description { get; }
    string? CoverImageUrl { get; }
    string? Color { get; }
}
