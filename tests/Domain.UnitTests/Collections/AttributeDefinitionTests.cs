using CurateDS.Domain.Collections;
using FluentAssertions;

namespace CurateDS.Domain.UnitTests.Collections;

public sealed class AttributeDefinitionTests
{
    [Fact]
    public void Create_ShouldGenerateNormalizedKey_FromName()
    {
        var definition = AttributeDefinition.Create(
            Guid.NewGuid(),
            " Release Year ",
            AttributeDataType.Number,
            isRequired: false,
            isFilterable: true,
            sortOrder: 0,
            createdUtc: DateTime.UtcNow);

        definition.Key.Should().Be("release-year");
    }
}
