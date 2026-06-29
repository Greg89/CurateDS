using System.Text.Json;
using FluentValidation;

namespace CurateDS.Application.Collections.CreateSavedView;

public sealed class CreateSavedViewCommandValidator : AbstractValidator<CreateSavedViewCommand>
{
    private const string InvalidSavedViewFiltersCode = "invalid_saved_view_filters";

    public CreateSavedViewCommandValidator()
    {
        RuleFor(command => command.OwnerId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name))
            .WithMessage("'Name' must not be empty.")
            .MaximumLength(100);

        RuleFor(command => command.FiltersJson)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(BeSupportedItemFiltersJson)
            .WithMessage("'FiltersJson' must be a supported item filter JSON object.")
            .WithErrorCode(InvalidSavedViewFiltersCode);
    }

    private static bool BeSupportedItemFiltersJson(string? value)
    {
        if (value is null) return false;

        try
        {
            using var document = JsonDocument.Parse(value);
            return IsSupportedItemFiltersObject(document.RootElement);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool IsSupportedItemFiltersObject(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object) return false;

        foreach (var property in root.EnumerateObject())
        {
            if (!IsSupportedFilterProperty(property))
            {
                return false;
            }
        }

        return true;
    }

    private static bool IsSupportedFilterProperty(JsonProperty property)
    {
        return property.Name switch
        {
            "searchText" or "locationId" or "itemTypeId" or "createdAfter" or "createdBefore" =>
                property.Value.ValueKind == JsonValueKind.String,
            "tagIds" => IsStringArray(property.Value),
            "attributeFilters" => IsStringMap(property.Value),
            "sortBy" => IsSortBy(property.Value),
            "sortDirection" => IsSortDirection(property.Value),
            "minQuantity" or "maxQuantity" => property.Value.ValueKind == JsonValueKind.Number,
            "hasNoLocation" or "hasNoTags" => property.Value.ValueKind == JsonValueKind.True ||
                property.Value.ValueKind == JsonValueKind.False,
            _ => false
        };
    }

    private static bool IsStringArray(JsonElement value)
    {
        return value.ValueKind == JsonValueKind.Array &&
            value.EnumerateArray().All(item => item.ValueKind == JsonValueKind.String);
    }

    private static bool IsStringMap(JsonElement value)
    {
        return value.ValueKind == JsonValueKind.Object &&
            value.EnumerateObject().All(property => property.Value.ValueKind == JsonValueKind.String);
    }

    private static bool IsSortBy(JsonElement value)
    {
        return value.ValueKind == JsonValueKind.String &&
            value.GetString() is "updatedUtc" or "createdUtc" or "name" or "quantity";
    }

    private static bool IsSortDirection(JsonElement value)
    {
        return value.ValueKind == JsonValueKind.String &&
            value.GetString() is "asc" or "desc";
    }
}
