using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CurateDS.Infrastructure.Persistence.Configurations;

internal sealed class SavedViewConfiguration : IEntityTypeConfiguration<SavedView>
{
    public void Configure(EntityTypeBuilder<SavedView> builder)
    {
        builder.ToTable("saved_views");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.CollectionId)
            .IsRequired();

        builder.Property(v => v.OwnerId)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(v => v.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(v => v.FiltersJson)
            .IsRequired();

        builder.Property(v => v.CreatedUtc)
            .IsRequired();
    }
}
