using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class ShowcasePublicationConfiguration : IEntityTypeConfiguration<ShowcasePublication>
{
    public void Configure(EntityTypeBuilder<ShowcasePublication> b)
    {
        b.ToTable("showcase_publications"); b.HasKey(p => p.CollectionId);
        b.Property(p => p.Slug).HasMaxLength(80);
        b.HasIndex(p => p.Slug).IsUnique();
        b.Property(p => p.Generation).IsConcurrencyToken();
        b.Property(p => p.SuspensionReason).HasMaxLength(40);
        // No cascading relationship to the catalog: slug tombstones must survive deletion.
    }
}
internal sealed class ShowcaseEditionConfiguration : IEntityTypeConfiguration<ShowcaseEdition>
{
    public void Configure(EntityTypeBuilder<ShowcaseEdition> b)
    {
        b.ToTable("showcase_editions"); b.HasKey(p => p.Id);
        b.Property(p => p.Slug).HasMaxLength(80);
        b.Property(p => p.Payload).HasColumnType("text");
        b.HasIndex(p => new { p.CollectionId, p.ExpiresUtc });
        b.HasMany(p => p.Assets).WithOne().HasForeignKey(p => p.EditionId).OnDelete(DeleteBehavior.Cascade);
    }
}
internal sealed class ShowcaseAssetConfiguration : IEntityTypeConfiguration<ShowcaseAsset>
{
    public void Configure(EntityTypeBuilder<ShowcaseAsset> b)
    {
        b.ToTable("showcase_assets"); b.HasKey(p => p.Id);
        b.Property(p => p.StorageKey).HasMaxLength(300);
    }
}
