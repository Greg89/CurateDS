using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class ItemAttributeValueConfiguration : IEntityTypeConfiguration<ItemAttributeValue>
{
    public void Configure(EntityTypeBuilder<ItemAttributeValue> builder)
    {
        builder.ToTable("item_attribute_values");

        builder.HasKey(attributeValue => attributeValue.Id);

        builder.Property(attributeValue => attributeValue.ItemId)
            .IsRequired();

        builder.Property(attributeValue => attributeValue.AttributeDefinitionId)
            .IsRequired();

        builder.Property(attributeValue => attributeValue.ValueText)
            .HasMaxLength(500);

        builder.Property(attributeValue => attributeValue.ValueDecimal)
            .HasPrecision(18, 2);

        builder.Property(attributeValue => attributeValue.ValueDate)
            .HasColumnType("date");

        builder.HasIndex(attributeValue => new
        {
            attributeValue.ItemId,
            attributeValue.AttributeDefinitionId
        })
            .IsUnique();
    }
}
