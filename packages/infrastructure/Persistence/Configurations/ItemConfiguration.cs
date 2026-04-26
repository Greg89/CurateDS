using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class ItemConfiguration : IEntityTypeConfiguration<Item>
{
    public void Configure(EntityTypeBuilder<Item> builder)
    {
        builder.ToTable("items");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.CollectionId)
            .IsRequired();

        builder.Property(item => item.Name)
            .IsRequired()
            .HasMaxLength(120);

        builder.Property(item => item.Description)
            .HasMaxLength(2000);

        builder.Property(item => item.Quantity)
            .IsRequired();

        builder.Property(item => item.LocationId);

        builder.Property(item => item.CreatedUtc)
            .IsRequired();

        builder.Property(item => item.CreatedBy)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(item => item.UpdatedUtc);

        builder.Property(item => item.UpdatedBy)
            .HasMaxLength(200);

        builder.Property(item => item.DeletedUtc);

        builder.Property(item => item.DeletedBy)
            .HasMaxLength(200);

        builder.HasMany(item => item.AttributeValues)
            .WithOne()
            .HasForeignKey(attributeValue => attributeValue.ItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(item => item.ItemTags)
            .WithOne()
            .HasForeignKey(itemTag => itemTag.ItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Location>()
            .WithMany()
            .HasForeignKey(item => item.LocationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(item => new
        {
            item.CollectionId,
            item.CreatedUtc
        });
    }
}
