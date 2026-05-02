using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.ToTable("tags");

        builder.HasKey(tag => tag.Id);

        builder.Property(tag => tag.OwnerId)
            .IsRequired();

        builder.Property(tag => tag.Name)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(tag => tag.Key)
            .IsRequired()
            .HasMaxLength(60);

        builder.Property(tag => tag.CreatedUtc)
            .IsRequired();

        builder.Property(tag => tag.CreatedBy)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(tag => tag.UpdatedUtc);

        builder.Property(tag => tag.UpdatedBy)
            .HasMaxLength(200);

        builder.Property(tag => tag.DeletedUtc);

        builder.Property(tag => tag.DeletedBy)
            .HasMaxLength(200);

        builder.HasIndex(tag => new { tag.OwnerId, tag.Key })
            .IsUnique()
            .HasFilter("deleted_utc IS NULL");
    }
}
