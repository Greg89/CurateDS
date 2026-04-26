using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class ItemEventConfiguration : IEntityTypeConfiguration<ItemEvent>
{
    public void Configure(EntityTypeBuilder<ItemEvent> builder)
    {
        builder.ToTable("item_events");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.ItemId)
            .IsRequired();

        builder.Property(e => e.CollectionId)
            .IsRequired();

        builder.Property(e => e.EventType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(e => e.OccurredUtc)
            .IsRequired();

        builder.Property(e => e.OccurredBy)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(e => e.Notes)
            .HasMaxLength(500);

        builder.HasIndex(e => new { e.ItemId, e.OccurredUtc });
        builder.HasIndex(e => e.CollectionId);
    }
}
