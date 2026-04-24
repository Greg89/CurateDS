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

        builder.HasIndex(location => new { location.OwnerId, location.Name })
            .IsUnique();
    }
}
