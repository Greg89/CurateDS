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
    public async Task Validate_ShouldFail_WhenFiltersJsonIsNotValidJson()
    {
        var result = await Validator.ValidateAsync(ValidCommand() with { FiltersJson = "not-json" });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e =>
            e.PropertyName == nameof(CreateSavedViewCommand.FiltersJson) &&
            e.ErrorMessage == "'FiltersJson' must be a valid JSON string.");
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"search\":\"dragon\"}")]
    [InlineData("{\"tagIds\":[],\"attributeFilters\":[]}")]
    public async Task Validate_ShouldPass_WhenFiltersJsonIsValidJson(string filtersJson)
    {
        var result = await Validator.ValidateAsync(ValidCommand() with { FiltersJson = filtersJson });

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_ShouldFail_WhenFiltersJsonIsEmpty()
    {
        var result = await Validator.ValidateAsync(ValidCommand() with { FiltersJson = "" });

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateSavedViewCommand.FiltersJson));
    }
}
