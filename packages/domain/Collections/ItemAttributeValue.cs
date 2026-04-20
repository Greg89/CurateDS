using System.Globalization;

namespace CurateDS.Domain.Collections;

public sealed class ItemAttributeValue
{
    private ItemAttributeValue()
    {
    }

    private ItemAttributeValue(
        Guid id,
        Guid itemId,
        Guid attributeDefinitionId,
        string? valueText,
        int? valueNumber,
        decimal? valueDecimal,
        bool? valueBoolean,
        DateTime? valueDate)
    {
        Id = id;
        ItemId = itemId;
        AttributeDefinitionId = attributeDefinitionId;
        ValueText = valueText;
        ValueNumber = valueNumber;
        ValueDecimal = valueDecimal;
        ValueBoolean = valueBoolean;
        ValueDate = valueDate;
    }

    public Guid Id { get; }

    public Guid ItemId { get; private set; }

    public Guid AttributeDefinitionId { get; private set; }

    public string? ValueText { get; private set; }

    public int? ValueNumber { get; private set; }

    public decimal? ValueDecimal { get; private set; }

    public bool? ValueBoolean { get; private set; }

    public DateTime? ValueDate { get; private set; }

    public static ItemAttributeValue Create(Guid itemId, AttributeDefinition attributeDefinition, string value)
    {
        if (itemId == Guid.Empty)
        {
            throw new ArgumentException("Item ID is required.", nameof(itemId));
        }

        ArgumentNullException.ThrowIfNull(attributeDefinition);

        var normalizedValue = value.Trim();

        if (normalizedValue.Length == 0)
        {
            throw new ArgumentException("Attribute value is required.", nameof(value));
        }

        return attributeDefinition.DataType switch
        {
            AttributeDataType.Text or AttributeDataType.SingleSelect => CreateTextValue(
                itemId,
                attributeDefinition.Id,
                normalizedValue),
            AttributeDataType.Number => CreateNumberValue(
                itemId,
                attributeDefinition.Id,
                normalizedValue),
            AttributeDataType.Decimal => CreateDecimalValue(
                itemId,
                attributeDefinition.Id,
                normalizedValue),
            AttributeDataType.Boolean => CreateBooleanValue(
                itemId,
                attributeDefinition.Id,
                normalizedValue),
            AttributeDataType.Date => CreateDateValue(
                itemId,
                attributeDefinition.Id,
                normalizedValue),
            _ => throw new ArgumentOutOfRangeException(nameof(attributeDefinition), "Unsupported attribute data type.")
        };
    }

    public string GetDisplayValue(AttributeDataType dataType)
    {
        return dataType switch
        {
            AttributeDataType.Text or AttributeDataType.SingleSelect => ValueText ?? string.Empty,
            AttributeDataType.Number => ValueNumber?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
            AttributeDataType.Decimal => ValueDecimal?.ToString("0.##", CultureInfo.InvariantCulture) ?? string.Empty,
            AttributeDataType.Boolean => ValueBoolean?.ToString() ?? string.Empty,
            AttributeDataType.Date => ValueDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
            _ => string.Empty
        };
    }

    private static ItemAttributeValue CreateTextValue(Guid itemId, Guid attributeDefinitionId, string value)
    {
        if (value.Length > 500)
        {
            throw new ArgumentException("Text attribute values must be 500 characters or fewer.", nameof(value));
        }

        return new ItemAttributeValue(Guid.NewGuid(), itemId, attributeDefinitionId, value, null, null, null, null);
    }

    private static ItemAttributeValue CreateNumberValue(Guid itemId, Guid attributeDefinitionId, string value)
    {
        if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedValue))
        {
            throw new ArgumentException("Number attribute values must be whole numbers.", nameof(value));
        }

        return new ItemAttributeValue(Guid.NewGuid(), itemId, attributeDefinitionId, null, parsedValue, null, null, null);
    }

    private static ItemAttributeValue CreateDecimalValue(Guid itemId, Guid attributeDefinitionId, string value)
    {
        if (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsedValue))
        {
            throw new ArgumentException("Decimal attribute values must be numeric.", nameof(value));
        }

        return new ItemAttributeValue(Guid.NewGuid(), itemId, attributeDefinitionId, null, null, parsedValue, null, null);
    }

    private static ItemAttributeValue CreateBooleanValue(Guid itemId, Guid attributeDefinitionId, string value)
    {
        if (!bool.TryParse(value, out var parsedValue))
        {
            throw new ArgumentException("Boolean attribute values must be true or false.", nameof(value));
        }

        return new ItemAttributeValue(Guid.NewGuid(), itemId, attributeDefinitionId, null, null, null, parsedValue, null);
    }

    private static ItemAttributeValue CreateDateValue(Guid itemId, Guid attributeDefinitionId, string value)
    {
        if (!DateTime.TryParseExact(
                value,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var parsedValue))
        {
            throw new ArgumentException("Date attribute values must use yyyy-MM-dd format.", nameof(value));
        }

        return new ItemAttributeValue(
            Guid.NewGuid(),
            itemId,
            attributeDefinitionId,
            null,
            null,
            null,
            null,
            DateTime.SpecifyKind(parsedValue, DateTimeKind.Utc));
    }
}
