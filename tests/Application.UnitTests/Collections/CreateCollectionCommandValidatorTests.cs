using CurateDS.Application.Collections.CreateCollection;
using FluentAssertions;

namespace CurateDS.Application.UnitTests.Collections;

public sealed class CreateCollectionCommandValidatorTests
{
    [Fact]
    public void Validate_ShouldFail_WhenNameIsEmpty()
    {
        var validator = new CreateCollectionCommandValidator();
        var command = new CreateCollectionCommand(Guid.NewGuid(), string.Empty);

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_ShouldFail_WhenNameIsWhitespaceOnly()
    {
        var validator = new CreateCollectionCommandValidator();
        var command = new CreateCollectionCommand(Guid.NewGuid(), "   ");

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_ShouldFail_WhenTrimmedNameIsTooShort()
    {
        var validator = new CreateCollectionCommandValidator();
        var command = new CreateCollectionCommand(Guid.NewGuid(), " ab ");

        var result = validator.Validate(command);

        result.IsValid.Should().BeFalse();
    }
}
