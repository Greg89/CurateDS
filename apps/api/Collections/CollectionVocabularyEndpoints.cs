using CurateDS.Api.ApiContracts;
using CurateDS.Application.Abstractions;
using CurateDS.Application.Collections.UpdateCollection;
using CurateDS.Application.Common;
using FluentValidation;

namespace CurateDS.Api.Collections;

public sealed record UpdateCollectionVocabularyRequest(string ItemLabel, string ItemsLabel);

public static class CollectionVocabularyEndpoints
{
    public static IEndpointRouteBuilder MapCollectionVocabularyEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPut("/collections/{collectionId:guid}/vocabulary", async (Guid collectionId,
            UpdateCollectionVocabularyRequest request, UpdateCollectionVocabularyService service,
            ICurrentUserService user, CancellationToken ct) =>
        {
            try
            {
                return Results.Ok(CollectionResponseMappers.ToCollectionResponse(await service.ExecuteAsync(
                    user.GetCurrentUser(), collectionId, request.ItemLabel, request.ItemsLabel, ct)));
            }
            catch (NotFoundException) { return ApiResponses.NotFound("Collection was not found."); }
            catch (ValidationException error) { return ApiResponses.Validation(error); }
        }).RequireAuthorization().Produces<CollectionResponse>();
        return app;
    }
}
