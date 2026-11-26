using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurateDS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCollectionPresentation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PinnedItemIds",
                table: "collections",
                type: "text",
                nullable: false,
                defaultValueSql: "'[]'");

            migrationBuilder.AddColumn<bool>(
                name: "ShowCover",
                table: "collections",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowPinnedItems",
                table: "collections",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowRecentItems",
                table: "collections",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowSummary",
                table: "collections",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PinnedItemIds",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "ShowCover",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "ShowPinnedItems",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "ShowRecentItems",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "ShowSummary",
                table: "collections");
        }
    }
}
