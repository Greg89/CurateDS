using CurateDS.Application.Collections.CreateCollection;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateCollectionCommandValidatorTests
{
    [Fact]
    public void Validate_ShouldFail_WhenNameIsEmpty()
    {
        var validator = new CreateCollectionCommandValidator();
        var command = new CreateCollectionCommand("auth0|test-owner", string.Empty);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_ShouldFail_WhenNameIsWhitespaceOnly()
    {
        var validator = new CreateCollectionCommandValidator();
        var command = new CreateCollectionCommand("auth0|test-owner", "   ");

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_ShouldFail_WhenTrimmedNameIsTooShort()
    {
        var validator = new CreateCollectionCommandValidator();
        var command = new CreateCollectionCommand("auth0|test-owner", " ab ");

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }
}
