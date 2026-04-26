using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class AttributeDefinitionConfiguration : IEntityTypeConfiguration<AttributeDefinition>
{
    public void Configure(EntityTypeBuilder<AttributeDefinition> builder)
    {
        builder.ToTable("attribute_definitions");

        builder.HasKey(attributeDefinition => attributeDefinition.Id);

        builder.Property(attributeDefinition => attributeDefinition.CollectionId)
            .IsRequired();

        builder.Property(attributeDefinition => attributeDefinition.Name)
            .IsRequired()
            .HasMaxLength(60);

        builder.Property(attributeDefinition => attributeDefinition.Key)
            .IsRequired()
            .HasMaxLength(60);

        builder.Property(attributeDefinition => attributeDefinition.DataType)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(attributeDefinition => attributeDefinition.IsRequired)
            .IsRequired();

        builder.Property(attributeDefinition => attributeDefinition.IsFilterable)
            .IsRequired();

        builder.Property(attributeDefinition => attributeDefinition.SortOrder)
            .IsRequired();

        builder.Property(attributeDefinition => attributeDefinition.CreatedUtc)
            .IsRequired();

        builder.Property(attributeDefinition => attributeDefinition.CreatedBy)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(attributeDefinition => attributeDefinition.UpdatedUtc)
            .IsRequired();

        builder.Property(attributeDefinition => attributeDefinition.UpdatedBy)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(attributeDefinition => attributeDefinition.DeletedUtc);

        builder.Property(attributeDefinition => attributeDefinition.DeletedBy)
            .HasMaxLength(200);

        builder.HasIndex(attributeDefinition => new
        {
            attributeDefinition.CollectionId,
            attributeDefinition.SortOrder
        });
    }
}
