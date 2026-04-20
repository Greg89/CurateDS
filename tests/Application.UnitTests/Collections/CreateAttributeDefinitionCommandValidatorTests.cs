using CurateDS.Application.Collections.CreateAttributeDefinition;
using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateAttributeDefinitionCommandValidatorTests
{
    [Fact]
    public void Validate_ShouldFail_WhenNameIsWhitespaceOnly()
    {
        var validator = new CreateAttributeDefinitionCommandValidator();
        var command = new CreateAttributeDefinitionCommand(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "   ",
            AttributeDataType.Text,
            false,
            false);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_ShouldFail_WhenTrimmedNameIsTooShort()
    {
        var validator = new CreateAttributeDefinitionCommandValidator();
        var command = new CreateAttributeDefinitionCommand(
            Guid.NewGuid(),
            Guid.NewGuid(),
            " a ",
            AttributeDataType.Text,
            false,
            false);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }
}
