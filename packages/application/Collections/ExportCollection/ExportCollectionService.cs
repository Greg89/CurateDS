using System.IO.Compression;
using System.Text;
using CurateDS.Application.Abstractions.Persistence;
using CurateDS.Application.Common;
using CurateDS.Domain.Collections;

namespace CurateDS.Application.Collections.ExportCollection;

public sealed class ExportCollectionService
{
    private readonly ICollectionRepository _collectionRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IAttributeDefinitionRepository _attributeDefinitionRepository;
    private readonly ITagRepository _tagRepository;
    private readonly ILocationRepository _locationRepository;

    public ExportCollectionService(
        ICollectionRepository collectionRepository,
        IItemRepository itemRepository,
        IAttributeDefinitionRepository attributeDefinitionRepository,
        ITagRepository tagRepository,
        ILocationRepository locationRepository)
    {
        _collectionRepository = collectionRepository;
        _itemRepository = itemRepository;
        _attributeDefinitionRepository = attributeDefinitionRepository;
        _tagRepository = tagRepository;
        _locationRepository = locationRepository;
    }

    public async Task<CollectionExportResult> ExecuteAsync(
        ExportCollectionQuery query,
        CancellationToken cancellationToken)
    {
        var collection = await _collectionRepository.GetByIdAndOwnerAsync(
            query.CollectionId, query.OwnerId, cancellationToken);

        if (collection is null)
            throw new NotFoundException("Collection was not found.");

        var items = await _itemRepository.ListByCollectionAsync(query.CollectionId, cancellationToken);
        var attributeDefinitions = await _attributeDefinitionRepository.ListByCollectionAsync(query.CollectionId, cancellationToken);
        var tags = await _tagRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);
        var locations = await _locationRepository.ListByOwnerAsync(query.OwnerId, cancellationToken);

        var tagLookup = tags.ToDictionary(t => t.Id, t => t.Name);
        var locationLookup = locations.ToDictionary(l => l.Id, l => l.Name);

        var itemsCsv = BuildItemsCsv(items, attributeDefinitions, tagLookup, locationLookup);
        var attributesCsv = BuildAttributeDefinitionsCsv(attributeDefinitions);

        var safeName = string.Concat(collection.Name.Split(Path.GetInvalidFileNameChars())).Trim();
        var fileName = $"{safeName}-export.zip";

        var zipBytes = BuildZip(itemsCsv, attributesCsv);

        return new CollectionExportResult(zipBytes, fileName);
    }

    private static byte[] BuildZip(string itemsCsv, string attributesCsv)
    {
        using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteEntry(archive, "items.csv", itemsCsv);
            WriteEntry(archive, "attribute_definitions.csv", attributesCsv);
        }

        return ms.ToArray();
    }

    private static void WriteEntry(ZipArchive archive, string entryName, string content)
    {
        var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
        using var writer = new StreamWriter(entry.Open(), Encoding.UTF8);
        writer.Write(content);
    }

    private static string BuildItemsCsv(
        IReadOnlyList<Item> items,
        IReadOnlyList<AttributeDefinition> attributeDefinitions,
        Dictionary<Guid, string> tagLookup,
        Dictionary<Guid, string> locationLookup)
    {
        var sb = new StringBuilder();

        // Header row: fixed columns + one column per attribute definition
        var fixedHeaders = new[] { "id", "name", "description", "quantity", "location", "tags", "created_utc", "updated_utc" };
        var attrHeaders = attributeDefinitions.Select(a => CsvEscape(a.Name)).ToArray();
        sb.AppendLine(string.Join(",", fixedHeaders.Concat(attrHeaders)));

        foreach (var item in items)
        {
            var location = item.LocationId.HasValue && locationLookup.TryGetValue(item.LocationId.Value, out var locName)
                ? locName
                : "";

            var tags = string.Join("; ", item.ItemTags
                .Where(it => tagLookup.ContainsKey(it.TagId))
                .Select(it => tagLookup[it.TagId]));

            var fixedValues = new[]
            {
                CsvEscape(item.Id.ToString()),
                CsvEscape(item.Name),
                CsvEscape(item.Description ?? ""),
                CsvEscape(item.Quantity.ToString()),
                CsvEscape(location),
                CsvEscape(tags),
                CsvEscape(item.CreatedUtc.ToString("O")),
                CsvEscape(item.UpdatedUtc?.ToString("O") ?? "")
            };

            var attrValueLookup = item.AttributeValues
                .ToDictionary(av => av.AttributeDefinitionId, av => ResolveValue(av));

            var attrValues = attributeDefinitions
                .Select(a => CsvEscape(attrValueLookup.TryGetValue(a.Id, out var v) ? v : ""))
                .ToArray();

            sb.AppendLine(string.Join(",", fixedValues.Concat(attrValues)));
        }

        return sb.ToString();
    }

    private static string BuildAttributeDefinitionsCsv(IReadOnlyList<AttributeDefinition> attributeDefinitions)
    {
        var sb = new StringBuilder();
        sb.AppendLine("id,name,key,data_type,is_required,is_filterable");

        foreach (var a in attributeDefinitions)
        {
            sb.AppendLine(string.Join(",", new[]
            {
                CsvEscape(a.Id.ToString()),
                CsvEscape(a.Name),
                CsvEscape(a.Key),
                CsvEscape(a.DataType.ToString()),
                CsvEscape(a.IsRequired.ToString().ToLower()),
                CsvEscape(a.IsFilterable.ToString().ToLower())
            }));
        }

        return sb.ToString();
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }

    private static string ResolveValue(ItemAttributeValue av)
    {
        if (av.ValueText is not null) return av.ValueText;
        if (av.ValueNumber is not null) return av.ValueNumber.Value.ToString();
        if (av.ValueDecimal is not null) return av.ValueDecimal.Value.ToString();
        if (av.ValueBoolean is not null) return av.ValueBoolean.Value ? "true" : "false";
        if (av.ValueDate is not null) return av.ValueDate.Value.ToString("yyyy-MM-dd");
        return "";
    }
}
