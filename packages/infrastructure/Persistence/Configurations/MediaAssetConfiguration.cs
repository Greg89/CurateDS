using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class MediaAssetConfiguration : IEntityTypeConfiguration<MediaAsset>
{
    public void Configure(EntityTypeBuilder<MediaAsset> builder)
    {
        builder.ToTable("media_assets");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.ItemId)
            .IsRequired();

        builder.Property(a => a.CollectionId)
            .IsRequired();

        builder.Property(a => a.StorageKey)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(a => a.ContentType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.FileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(a => a.SizeBytes)
            .IsRequired();

        builder.Property(a => a.IsPrimary)
            .IsRequired();

        builder.Property(a => a.UploadedUtc)
            .IsRequired();

        builder.HasIndex(a => new { a.ItemId, a.IsPrimary });
    }
}
