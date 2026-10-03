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

        builder.Property(collection => collection.UpdatedBy)
            .HasMaxLength(200);

        builder.Property(collection => collection.DeletedUtc);

        builder.Property(collection => collection.DeletedBy)
            .HasMaxLength(200);
    }
}
