using CurateDS.Application.Collections.CreateItem;
using CurateDS.Application.Collections.UpdateItem;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class UpdateItemCommandValidatorTests
{
    [Fact]
    public void Validate_ShouldFail_WhenTrimmedNameIsTooShort()
    {
        var validator = new UpdateItemCommandValidator();
        var command = new UpdateItemCommand(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            " a ",
            null,
            1,
            []);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_ShouldFail_WhenDuplicateAttributeDefinitionsAreProvided()
    {
        var validator = new UpdateItemCommandValidator();
        var attributeDefinitionId = Guid.NewGuid();
        var command = new UpdateItemCommand(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Vintage Card",
            null,
            1,
            [
                new CreateItemAttributeValueInput(attributeDefinitionId, "Blue"),
                new CreateItemAttributeValueInput(attributeDefinitionId, "Red")
            ]);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }
}
