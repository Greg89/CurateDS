using CurateDS.Domain.Collections;
using Microsoft.EntityFrameworkCore;

namespace CurateDS.Infrastructure.Persistence;

public sealed class CatalogDbContext(DbContextOptions<CatalogDbContext> options) : DbContext(options)
{
    public DbSet<AttributeDefinition> AttributeDefinitions => Set<AttributeDefinition>();

    public DbSet<Collection> Collections => Set<Collection>();

    public DbSet<Item> Items => Set<Item>();

    public DbSet<ItemAttributeValue> ItemAttributeValues => Set<ItemAttributeValue>();

    public DbSet<ItemTag> ItemTags => Set<ItemTag>();

    public DbSet<Location> Locations => Set<Location>();

    public DbSet<Tag> Tags => Set<Tag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CatalogDbContext).Assembly);
    }
}
