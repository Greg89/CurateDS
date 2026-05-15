using CurateDS.Api.Collections;
using FluentAssertions;

namespace CurateDS.Api.IntegrationTests;

public sealed class CollectionResponseMappersTests
{
    [Fact]
    public void ParseAttributeFilters_ShouldReturnEmpty_WhenInputIsNull()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters(null);

        result.Should().BeEmpty();
    }

    [Fact]
    public void ParseAttributeFilters_ShouldReturnEmpty_WhenInputIsEmptyArray()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters([]);

        result.Should().BeEmpty();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ParseAttributeFilters_ShouldSkipEntry_WhenEntryIsNullOrWhitespace(string entry)
    {
        var result = CollectionResponseMappers.ParseAttributeFilters([entry]);

        result.Should().BeEmpty();
    }

    [Fact]
    public void ParseAttributeFilters_ShouldSkipEntry_WhenNoEqualsSign()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters(["color"]);

        result.Should().BeEmpty();
    }

    [Fact]
    public void ParseAttributeFilters_ShouldSkipEntry_WhenEqualsIsAtStart()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters(["=blue"]);

        result.Should().BeEmpty();
    }

    [Fact]
    public void ParseAttributeFilters_ShouldSkipEntry_WhenEqualsIsAtEnd()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters(["color="]);

        result.Should().BeEmpty();
    }

    [Fact]
    public void ParseAttributeFilters_ShouldSkipEntry_WhenKeyIsWhitespaceAfterTrim()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters(["  =blue"]);

        result.Should().BeEmpty();
    }

    [Fact]
    public void ParseAttributeFilters_ShouldSkipEntry_WhenValueIsWhitespaceAfterTrim()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters(["color=  "]);

        result.Should().BeEmpty();
    }

    [Fact]
    public void ParseAttributeFilters_ShouldParseValidEntry()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters(["color=blue"]);

        result.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new { AttributeKey = "color", Value = "blue" });
    }

    [Fact]
    public void ParseAttributeFilters_ShouldTrimKeyAndValue()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters([" color = blue "]);

        result.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new { AttributeKey = "color", Value = "blue" });
    }

    [Fact]
    public void ParseAttributeFilters_ShouldPreserveValueAfterSecondEquals()
    {
        // Values containing '=' are valid — only the first '=' is the separator
        var result = CollectionResponseMappers.ParseAttributeFilters(["encoded=abc=def"]);

        result.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new { AttributeKey = "encoded", Value = "abc=def" });
    }

    [Fact]
    public void ParseAttributeFilters_ShouldSkipInvalidAndKeepValid()
    {
        var result = CollectionResponseMappers.ParseAttributeFilters(["color=blue", "badentry", "material=wood"]);

        result.Should().HaveCount(2);
        result.Should().ContainEquivalentOf(new { AttributeKey = "color", Value = "blue" });
        result.Should().ContainEquivalentOf(new { AttributeKey = "material", Value = "wood" });
    }
}
