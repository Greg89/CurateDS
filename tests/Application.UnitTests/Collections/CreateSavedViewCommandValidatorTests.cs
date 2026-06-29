using CurateDS.Application.Collections.CreateSavedView;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateSavedViewCommandValidatorTests
{
    private static readonly CreateSavedViewCommandValidator Validator = new();

    private static CreateSavedViewCommand ValidCommand() =>
        new("auth0|test-owner", Guid.NewGuid(), "My View", "{}");

    [Fact]
    public async Task Validate_ShouldPass_WhenAllFieldsAreValid()
    {
        var result = await Validator.ValidateAsync(ValidCommand());

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_ShouldFail_WhenOwnerIdIsEmpty()
    {
        var result = await Validator.ValidateAsync(ValidCommand() with { OwnerId = "" });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == nameof(CreateSavedViewCommand.OwnerId));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Validate_ShouldFail_WhenNameIsEmpty(string name)
    {
        var result = await Validator.ValidateAsync(ValidCommand() with { Name = name });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e =>
            e.PropertyName == nameof(CreateSavedViewCommand.Name) &&
            e.ErrorMessage == "'Name' must not be empty.");
    }

    [Fact]
    public async Task Validate_ShouldFail_WhenFiltersJsonIsNotSupportedItemFilterJson()
    {
        var result = await Validator.ValidateAsync(ValidCommand() with { FiltersJson = "not-json" });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e =>
            e.PropertyName == nameof(CreateSavedViewCommand.FiltersJson) &&
            e.ErrorMessage == "'FiltersJson' must be a supported item filter JSON object." &&
            e.ErrorCode == "invalid_saved_view_filters");
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"searchText\":\"dragon\",\"locationId\":\"loc-1\",\"itemTypeId\":\"type-1\"}")]
    [InlineData("{\"tagIds\":[\"tag-a\",\"tag-b\"],\"attributeFilters\":{\"era\":\"1950s\"}}")]
    [InlineData("{\"sortBy\":\"quantity\",\"sortDirection\":\"asc\",\"minQuantity\":1,\"maxQuantity\":5}")]
    [InlineData("{\"createdAfter\":\"2026-01-01\",\"createdBefore\":\"2026-12-31\",\"hasNoLocation\":true,\"hasNoTags\":false}")]
    public async Task Validate_ShouldPass_WhenFiltersJsonMatchesSupportedItemFilterShape(string filtersJson)
    {
        var result = await Validator.ValidateAsync(ValidCommand() with { FiltersJson = filtersJson });

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("{\"search\":\"dragon\"}")]
    [InlineData("{\"tagIds\":\"tag-a\"}")]
    [InlineData("{\"attributeFilters\":[]}")]
    [InlineData("{\"attributeFilters\":{\"era\":1950}}")]
    [InlineData("{\"sortBy\":\"rating\"}")]
    [InlineData("{\"sortDirection\":\"sideways\"}")]
    [InlineData("{\"minQuantity\":\"1\"}")]
    [InlineData("{\"hasNoLocation\":\"true\"}")]
    public async Task Validate_ShouldFail_WhenFiltersJsonHasUnsupportedShape(string filtersJson)
    {
        var result = await Validator.ValidateAsync(ValidCommand() with { FiltersJson = filtersJson });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e =>
            e.PropertyName == nameof(CreateSavedViewCommand.FiltersJson) &&
            e.ErrorCode == "invalid_saved_view_filters");
    }

    [Fact]
    public async Task Validate_ShouldFail_WhenFiltersJsonIsEmpty()
    {
        var result = await Validator.ValidateAsync(ValidCommand() with { FiltersJson = "" });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateSavedViewCommand.FiltersJson));
    }
}
