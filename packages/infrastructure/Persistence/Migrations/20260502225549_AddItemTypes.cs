using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurateDS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddItemTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ItemTypeId",
                table: "items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ItemTypeId",
                table: "attribute_definitions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "item_types",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    DeletedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_types", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_items_ItemTypeId",
                table: "items",
                column: "ItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_attribute_definitions_ItemTypeId",
                table: "attribute_definitions",
                column: "ItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_item_types_CollectionId_SortOrder",
                table: "item_types",
                columns: new[] { "CollectionId", "SortOrder" });

            migrationBuilder.AddForeignKey(
                name: "FK_attribute_definitions_item_types_ItemTypeId",
                table: "attribute_definitions",
                column: "ItemTypeId",
                principalTable: "item_types",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_items_item_types_ItemTypeId",
                table: "items",
                column: "ItemTypeId",
                principalTable: "item_types",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_attribute_definitions_item_types_ItemTypeId",
                table: "attribute_definitions");

            migrationBuilder.DropForeignKey(
                name: "FK_items_item_types_ItemTypeId",
                table: "items");

            migrationBuilder.DropTable(
                name: "item_types");

            migrationBuilder.DropIndex(
                name: "IX_items_ItemTypeId",
                table: "items");

            migrationBuilder.DropIndex(
                name: "IX_attribute_definitions_ItemTypeId",
                table: "attribute_definitions");

            migrationBuilder.DropColumn(
                name: "ItemTypeId",
                table: "items");

            migrationBuilder.DropColumn(
                name: "ItemTypeId",
                table: "attribute_definitions");
        }
    }
}
