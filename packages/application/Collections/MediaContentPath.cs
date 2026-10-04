namespace CurateDS.Application.Collections;

public static class MediaContentPath
{
    public static string For(Guid collectionId, Guid itemId, Guid assetId) =>
        $"/collections/{collectionId}/items/{itemId}/media/{assetId}/content";
}
