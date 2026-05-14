using CurateDS.Application.Collections;
using CurateDS.Application.Collections.ListItems;
namespace CurateDS.Api.Collections;

internal static class CollectionResponseMappers
{
    public static CollectionResponse ToCollectionResponse(CollectionDto collection) =>
        new(collection.Id, collection.Name, collection.CreatedUtc);

    public static AttributeDefinitionResponse ToAttributeDefinitionResponse(AttributeDefinitionDto attributeDefinition) =>
        new(
            attributeDefinition.Id,
            attributeDefinition.CollectionId,
            attributeDefinition.Name,
            attributeDefinition.Key,
            attributeDefinition.DataType,
            attributeDefinition.IsRequired,
            attributeDefinition.IsFilterable,
            attributeDefinition.SortOrder,
            attributeDefinition.ItemTypeId,
            attributeDefinition.CreatedUtc);

    public static ItemSummaryResponse ToItemSummaryResponse(ItemSummaryDto item) =>
        new(
            item.Id,
            item.CollectionId,
            item.Name,
            item.Description,
            item.Quantity,
            item.LocationId,
            item.LocationName,
            item.Tags,
            item.AttributeValueCount,
            item.CreatedUtc,
            item.UpdatedUtc,
            item.PrimaryImageUrl);

    public static ItemDetailResponse ToItemDetailResponse(ItemDetailDto item) =>
        new(
            item.Id,
            item.CollectionId,
            item.Name,
            item.Description,
            item.Quantity,
            item.LocationId,
            item.LocationName,
            item.ItemTypeId,
            item.Tags.Select(tag => new TagResponse(tag.Id, tag.Name, tag.Key, tag.CreatedUtc)).ToArray(),
            item.CreatedUtc,
            item.UpdatedUtc,
            item.AttributeValues.Select(attributeValue => new ItemAttributeValueResponse(
                attributeValue.AttributeDefinitionId,
                attributeValue.AttributeName,
                attributeValue.AttributeKey,
                attributeValue.DataType,
                attributeValue.Value)).ToArray(),
            item.MediaAssets.Select(a => new MediaAssetResponse(
                a.Id,
                a.Url,
                a.ContentType,
                a.FileName,
                a.SizeBytes,
                a.IsPrimary,
                a.UploadedUtc)).ToArray());

    public static IReadOnlyList<ListItemsAttributeFilter> ParseAttributeFilters(string[]? attributeFilters)
    {
        if (attributeFilters is null || attributeFilters.Length == 0)
        {
            return [];
        }

        return attributeFilters
            .Select(ParseAttributeFilter)
            .Where(filter => filter is not null)
            .Cast<ListItemsAttributeFilter>()
            .ToArray();
    }

    private static ListItemsAttributeFilter? ParseAttributeFilter(string attributeFilter)
    {
        if (string.IsNullOrWhiteSpace(attributeFilter))
        {
            return null;
        }

        var separatorIndex = attributeFilter.IndexOf('=');

        if (separatorIndex <= 0 || separatorIndex >= attributeFilter.Length - 1)
        {
            return null;
        }

        var attributeKey = attributeFilter[..separatorIndex].Trim();
        var value = attributeFilter[(separatorIndex + 1)..].Trim();

        return string.IsNullOrWhiteSpace(attributeKey) || string.IsNullOrWhiteSpace(value)
            ? null
            : new ListItemsAttributeFilter(attributeKey, value);
    }
}
