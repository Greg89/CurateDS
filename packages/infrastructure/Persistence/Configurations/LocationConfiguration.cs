using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.ToTable("locations");

        builder.HasKey(location => location.Id);

        builder.Property(location => location.OwnerId)
            .IsRequired();

        builder.Property(location => location.Name)
            .IsRequired()
            .HasMaxLength(80);

        builder.Property(location => location.Description)
            .HasMaxLength(240);

        builder.Property(location => location.CreatedUtc)
            .IsRequired();

        builder.Property(location => location.CreatedBy)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(location => location.UpdatedUtc);

        builder.Property(location => location.UpdatedBy)
            .HasMaxLength(200);

        builder.Property(location => location.DeletedUtc);

        builder.Property(location => location.DeletedBy)
            .HasMaxLength(200);

        builder.HasIndex(location => new { location.OwnerId, location.Name })
            .IsUnique()
            .HasFilter("\"DeletedUtc\" IS NULL");
    }
}
