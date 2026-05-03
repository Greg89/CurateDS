using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class ItemTypeConfiguration : IEntityTypeConfiguration<ItemType>
{
    public void Configure(EntityTypeBuilder<ItemType> builder)
    {
        builder.ToTable("item_types");

        builder.HasKey(itemType => itemType.Id);

        builder.Property(itemType => itemType.CollectionId)
            .IsRequired();

        builder.Property(itemType => itemType.Name)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(itemType => itemType.SortOrder)
            .IsRequired();

        builder.Property(itemType => itemType.CreatedUtc)
            .IsRequired();

        builder.Property(itemType => itemType.CreatedBy)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(itemType => itemType.UpdatedUtc);

        builder.Property(itemType => itemType.UpdatedBy)
            .HasMaxLength(200);

        builder.Property(itemType => itemType.DeletedUtc);

        builder.Property(itemType => itemType.DeletedBy)
            .HasMaxLength(200);

        builder.HasIndex(itemType => new { itemType.CollectionId, itemType.SortOrder });
    }
}
