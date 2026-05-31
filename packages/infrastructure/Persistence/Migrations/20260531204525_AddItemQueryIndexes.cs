using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurateDS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddItemQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_items_CollectionId_UpdatedUtc",
                table: "items",
                columns: new[] { "CollectionId", "UpdatedUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_item_tags_TagId_ItemId",
                table: "item_tags",
                columns: new[] { "TagId", "ItemId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_items_CollectionId_UpdatedUtc",
                table: "items");

            migrationBuilder.DropIndex(
                name: "IX_item_tags_TagId_ItemId",
                table: "item_tags");
        }
    }
}
