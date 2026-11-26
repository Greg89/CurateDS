using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurateDS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCollectionVocabulary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ItemLabel",
                table: "collections",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "item");

            migrationBuilder.AddColumn<string>(
                name: "ItemsLabel",
                table: "collections",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "items");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ItemLabel",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "ItemsLabel",
                table: "collections");
        }
    }
}
