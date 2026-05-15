using CurateDS.Application.Collections.Shared;
using CurateDS.Domain.Collections;
using FluentAssertions;
using FluentValidation;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class ItemAttributeValueValidatorTests
{
    private static readonly Guid CollectionId = Guid.NewGuid();

    private static AttributeDefinition GlobalOptional(string name) =>
        AttributeDefinition.Create(
            CollectionId, name, AttributeDataType.Text,
            isRequired: false, isFilterable: false, sortOrder: 0,
            createdUtc: DateTime.UtcNow, createdBy: "system");

    private static AttributeDefinition GlobalRequired(string name) =>
        AttributeDefinition.Create(
            CollectionId, name, AttributeDataType.Text,
            isRequired: true, isFilterable: false, sortOrder: 0,
            createdUtc: DateTime.UtcNow, createdBy: "system");

    private static AttributeDefinition TypeRequired(string name, Guid itemTypeId) =>
        AttributeDefinition.Create(
            CollectionId, name, AttributeDataType.Text,
            isRequired: true, isFilterable: false, sortOrder: 0,
            createdUtc: DateTime.UtcNow, createdBy: "system",
            itemTypeId: itemTypeId);

    private static AttributeDefinition TypeOptional(string name, Guid itemTypeId) =>
        AttributeDefinition.Create(
            CollectionId, name, AttributeDataType.Text,
            isRequired: false, isFilterable: false, sortOrder: 0,
            createdUtc: DateTime.UtcNow, createdBy: "system",
            itemTypeId: itemTypeId);

    private static void Validate(
        IReadOnlyList<AttributeValueInput> attributeValues,
        IReadOnlyList<AttributeDefinition> attributeDefinitions,
        Guid? itemTypeId = null)
    {
        var lookup = attributeDefinitions.ToDictionary(d => d.Id);
        ItemAttributeValueValidator.Validate(attributeValues, attributeDefinitions, lookup, itemTypeId);
    }

    // -----------------------------------------------------------------------
    // Happy paths
    // -----------------------------------------------------------------------

    [Fact]
    public void Validate_ShouldNotThrow_WhenNoDefinitionsAndNoValues()
    {
        var act = () => Validate([], []);
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_ShouldNotThrow_WhenOptionalDefinitionHasNoValue()
    {
        var optional = GlobalOptional("Notes");
        var act = () => Validate([], [optional]);
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_ShouldNotThrow_WhenRequiredDefinitionHasValue()
    {
        var required = GlobalRequired("Condition");
        var act = () => Validate(
            [new AttributeValueInput(required.Id, "Near Mint")],
            [required]);
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_ShouldNotThrow_WhenTypeSpecificValueMatchesItemType()
    {
        var typeId = Guid.NewGuid();
        var typeSpecific = TypeOptional("Rarity", typeId);
        var act = () => Validate(
            [new AttributeValueInput(typeSpecific.Id, "Rare")],
            [typeSpecific],
            itemTypeId: typeId);
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_ShouldNotThrow_WhenTypeSpecificRequiredDefinitionDoesNotApplyToSelectedType()
    {
        var typeA = Guid.NewGuid();
        var typeB = Guid.NewGuid();
        var typeARequired = TypeRequired("Rarity", typeA);

        // Item is typeB — the typeA required field should be ignored
        var act = () => Validate([], [typeARequired], itemTypeId: typeB);
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_ShouldNotThrow_WhenNoItemTypeAndTypeSpecificDefinitionIsRequired()
    {
        var typeId = Guid.NewGuid();
        var typeRequired = TypeRequired("Rarity", typeId);

        // No item type selected — type-specific fields do not apply
        var act = () => Validate([], [typeRequired], itemTypeId: null);
        act.Should().NotThrow();
    }

    // -----------------------------------------------------------------------
    // Failure: required value missing
    // -----------------------------------------------------------------------

    [Fact]
    public void Validate_ShouldThrow_WhenRequiredGlobalAttributeIsMissing()
    {
        var required = GlobalRequired("Condition");

        var act = () => Validate([], [required]);

        act.Should().Throw<ValidationException>()
            .Which.Errors.Should().ContainSingle(e =>
                e.ErrorMessage.Contains("'Condition' is required"));
    }

    [Fact]
    public void Validate_ShouldThrow_WhenRequiredTypeSpecificAttributeIsMissingForMatchingType()
    {
        var typeId = Guid.NewGuid();
        var typeRequired = TypeRequired("Grading", typeId);

        var act = () => Validate([], [typeRequired], itemTypeId: typeId);

        act.Should().Throw<ValidationException>()
            .Which.Errors.Should().ContainSingle(e =>
                e.ErrorMessage.Contains("'Grading' is required"));
    }

    [Fact]
    public void Validate_ShouldRequireGlobalAttribute_EvenWhenItemTypeIsSelected()
    {
        var typeId = Guid.NewGuid();
        var globalRequired = GlobalRequired("Condition");

        var act = () => Validate([], [globalRequired], itemTypeId: typeId);

        act.Should().Throw<ValidationException>()
            .Which.Errors.Should().ContainSingle(e =>
                e.ErrorMessage.Contains("'Condition' is required"));
    }

    // -----------------------------------------------------------------------
    // Failure: value belongs to wrong item type
    // -----------------------------------------------------------------------

    [Fact]
    public void Validate_ShouldThrow_WhenValueBelongsToDefinitionOfDifferentItemType()
    {
        var typeA = Guid.NewGuid();
        var typeB = Guid.NewGuid();
        var typeADef = TypeOptional("Rarity", typeA);

        var act = () => Validate(
            [new AttributeValueInput(typeADef.Id, "Rare")],
            [typeADef],
            itemTypeId: typeB);

        act.Should().Throw<ValidationException>()
            .Which.Errors.Should().ContainSingle(e =>
                e.ErrorMessage.Contains("Attribute values must belong to the selected collection and item type"));
    }

    [Fact]
    public void Validate_ShouldThrow_WhenTypeSpecificValueProvidedWithNoItemTypeSelected()
    {
        var typeId = Guid.NewGuid();
        var typeSpecific = TypeOptional("Rarity", typeId);

        var act = () => Validate(
            [new AttributeValueInput(typeSpecific.Id, "Rare")],
            [typeSpecific],
            itemTypeId: null);

        act.Should().Throw<ValidationException>()
            .Which.Errors.Should().ContainSingle(e =>
                e.ErrorMessage.Contains("Attribute values must belong to the selected collection and item type"));
    }

    // -----------------------------------------------------------------------
    // Multiple failures accumulated
    // -----------------------------------------------------------------------

    [Fact]
    public void Validate_ShouldAccumulateMultipleFailures()
    {
        var typeA = Guid.NewGuid();
        var typeB = Guid.NewGuid();
        var globalRequired = GlobalRequired("Condition");
        var typeADef = TypeOptional("Rarity", typeA);

        // Item is typeB: wrong-type value + missing global required
        var act = () => Validate(
            [new AttributeValueInput(typeADef.Id, "Rare")],
            [globalRequired, typeADef],
            itemTypeId: typeB);

        act.Should().Throw<ValidationException>()
            .Which.Errors.Should().HaveCount(2);
    }
}
