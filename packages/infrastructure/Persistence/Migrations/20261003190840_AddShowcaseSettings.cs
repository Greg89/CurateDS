using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurateDS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShowcaseSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShowcaseLayout",
                table: "collections",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "gallery");

            migrationBuilder.AddColumn<bool>(
                name: "ShowcaseShowGrowth",
                table: "collections",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowcaseShowTypes",
                table: "collections",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowcaseLayout",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "ShowcaseShowGrowth",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "ShowcaseShowTypes",
                table: "collections");
        }
    }
}
