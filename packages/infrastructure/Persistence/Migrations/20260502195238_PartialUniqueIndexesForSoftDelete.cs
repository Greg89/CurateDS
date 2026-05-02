using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurateDS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PartialUniqueIndexesForSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tags_OwnerId_Key",
                table: "tags");

            migrationBuilder.DropIndex(
                name: "IX_locations_OwnerId_Name",
                table: "locations");

            migrationBuilder.CreateIndex(
                name: "IX_tags_OwnerId_Key",
                table: "tags",
                columns: new[] { "OwnerId", "Key" },
                unique: true,
                filter: "deleted_utc IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_locations_OwnerId_Name",
                table: "locations",
                columns: new[] { "OwnerId", "Name" },
                unique: true,
                filter: "deleted_utc IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tags_OwnerId_Key",
                table: "tags");

            migrationBuilder.DropIndex(
                name: "IX_locations_OwnerId_Name",
                table: "locations");

            migrationBuilder.CreateIndex(
                name: "IX_tags_OwnerId_Key",
                table: "tags",
                columns: new[] { "OwnerId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_locations_OwnerId_Name",
                table: "locations",
                columns: new[] { "OwnerId", "Name" },
                unique: true);
        }
    }
}
