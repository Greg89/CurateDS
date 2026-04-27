using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence;

public sealed class CatalogDbContext(DbContextOptions<CatalogDbContext> options) : DbContext(options)
{
    public DbSet<AttributeDefinition> AttributeDefinitions => Set<AttributeDefinition>();

    public DbSet<Collection> Collections => Set<Collection>();

    public DbSet<Item> Items => Set<Item>();

    public DbSet<ItemAttributeValue> ItemAttributeValues => Set<ItemAttributeValue>();

    public DbSet<ItemEvent> ItemEvents => Set<ItemEvent>();

    public DbSet<ItemTag> ItemTags => Set<ItemTag>();

    public DbSet<Location> Locations => Set<Location>();

    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();

    public DbSet<Tag> Tags => Set<Tag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CatalogDbContext).Assembly);

        // Global soft-delete filter: exclude rows where DeletedUtc has been set.
        modelBuilder.Entity<Collection>().HasQueryFilter(c => c.DeletedUtc == null);
        modelBuilder.Entity<Item>().HasQueryFilter(i => i.DeletedUtc == null);
        modelBuilder.Entity<Tag>().HasQueryFilter(t => t.DeletedUtc == null);
        modelBuilder.Entity<Location>().HasQueryFilter(l => l.DeletedUtc == null);
        modelBuilder.Entity<AttributeDefinition>().HasQueryFilter(a => a.DeletedUtc == null);
    }
}
