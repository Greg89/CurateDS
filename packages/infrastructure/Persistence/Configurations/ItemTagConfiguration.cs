using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class ItemTagConfiguration : IEntityTypeConfiguration<ItemTag>
{
    public void Configure(EntityTypeBuilder<ItemTag> builder)
    {
        builder.ToTable("item_tags");

        builder.HasKey(itemTag => new { itemTag.ItemId, itemTag.TagId });

        builder.Property(itemTag => itemTag.ItemId)
            .IsRequired();

        builder.Property(itemTag => itemTag.TagId)
            .IsRequired();

        // Reverse-direction index for "items that have this tag" lookups
        // (full-text search by tag name + filter-by-tag joins).
        builder.HasIndex(itemTag => new { itemTag.TagId, itemTag.ItemId });
    }
}
