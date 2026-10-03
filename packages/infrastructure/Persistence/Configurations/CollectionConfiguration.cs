using System.Text.Json;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class CollectionConfiguration : IEntityTypeConfiguration<Collection>
{
    public void Configure(EntityTypeBuilder<Collection> builder)
    {
        builder.ToTable("collections");

        builder.HasKey(collection => collection.Id);

        builder.Property(collection => collection.OwnerId)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(collection => collection.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(collection => collection.CreatedUtc)
            .IsRequired();

        builder.Property(collection => collection.CreatedBy)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(collection => collection.UpdatedUtc);

        builder.Property(collection => collection.Category).HasMaxLength(100);
        builder.Property(collection => collection.Description).HasMaxLength(1000);
        builder.Property(collection => collection.CoverImageUrl).HasMaxLength(2048);
        builder.Property(collection => collection.Color).HasMaxLength(20);
        builder.Property(collection => collection.ShowCover).HasDefaultValue(true);
        builder.Property(collection => collection.ShowSummary).HasDefaultValue(true);
        builder.Property(collection => collection.ShowPinnedItems).HasDefaultValue(true);
        builder.Property(collection => collection.ShowRecentItems).HasDefaultValue(true);
        builder.Property(collection => collection.PinnedItemIds)
            .HasConversion(
                ids => JsonSerializer.Serialize(ids, (JsonSerializerOptions?)null),
                json => Array.AsReadOnly(JsonSerializer.Deserialize<Guid[]>(json, (JsonSerializerOptions?)null)!))
            .HasColumnType("text")
            .HasDefaultValueSql("'[]'")
            .Metadata.SetValueComparer(new ValueComparer<IReadOnlyList<Guid>>(
                (left, right) => left!.SequenceEqual(right!),
                ids => ids.Aggregate(0, (hash, id) => HashCode.Combine(hash, id)),
                ids => Array.AsReadOnly(ids.ToArray())));

        builder.Property(collection => collection.UpdatedBy)
            .HasMaxLength(200);

        builder.Property(collection => collection.DeletedUtc);

        builder.Property(collection => collection.DeletedBy)
            .HasMaxLength(200);
    }
}
