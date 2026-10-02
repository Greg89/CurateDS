using CurateDS.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace CurateDS.Infrastructure.IntegrationTests;

/// <summary>
/// SQLite by default; the Docker test runner opts into PostgreSQL. Each PostgreSQL case gets
/// a generated database, so migrations and rejecting triggers cannot affect another case.
/// </summary>
internal sealed class TransactionTestDatabase : IAsyncDisposable
{
    private readonly SqliteConnection? _sqliteConnection;
    public DbContextOptions<CatalogDbContext> Options { get; }
    public bool IsPostgres => _sqliteConnection is null;

    private TransactionTestDatabase(DbContextOptions<CatalogDbContext> options, SqliteConnection? sqliteConnection)
    {
        Options = options;
        _sqliteConnection = sqliteConnection;
    }

    public static async Task<TransactionTestDatabase> OpenAsync()
    {
        var postgres = Environment.GetEnvironmentVariable("CURATEDS_TEST_POSTGRES");
        if (!string.IsNullOrWhiteSpace(postgres))
        {
            var connectionString = new NpgsqlConnectionStringBuilder(postgres)
            {
                Database = $"curateds_transaction_test_{Guid.NewGuid():N}",
                Pooling = false
            };
            return new TransactionTestDatabase(new DbContextOptionsBuilder<CatalogDbContext>()
                .UseNpgsql(connectionString.ConnectionString).Options, null);
        }

        var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        return new TransactionTestDatabase(new DbContextOptionsBuilder<CatalogDbContext>()
            .UseSqlite(connection).Options, connection);
    }

    public async Task InitializeAsync(CatalogDbContext context)
    {
        if (IsPostgres)
        {
            await context.Database.MigrateAsync();
        }
        else
        {
            await context.Database.EnsureCreatedAsync();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_sqliteConnection is not null)
        {
            await _sqliteConnection.DisposeAsync();
        }
        else
        {
            // Options always point at this fixture's generated database, never the supplied database.
            await using var cleanup = new CatalogDbContext(Options);
            await cleanup.Database.EnsureDeletedAsync();
        }
    }
}
