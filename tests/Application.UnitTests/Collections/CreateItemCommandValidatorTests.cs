using CurateDS.Application.Collections.CreateItem;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateItemCommandValidatorTests
{
    [Fact]
    public void Validate_ShouldFail_WhenTrimmedNameIsTooShort()
    {
        var validator = new CreateItemCommandValidator();
        var command = new CreateItemCommand(
            Guid.NewGuid(),
            Guid.NewGuid(),
            " a ",
            null,
            1,
            null,
            [],
            []);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_ShouldFail_WhenDuplicateAttributeDefinitionsAreProvided()
    {
        var validator = new CreateItemCommandValidator();
        var attributeDefinitionId = Guid.NewGuid();
        var command = new CreateItemCommand(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Vintage Card",
            null,
            1,
            null,
            [],
            [
                new CreateItemAttributeValueInput(attributeDefinitionId, "Blue"),
                new CreateItemAttributeValueInput(attributeDefinitionId, "Red")
            ]);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }
}
