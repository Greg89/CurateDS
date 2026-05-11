using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurateDS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OwnerIdStringType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE tags ALTER COLUMN \"OwnerId\" TYPE character varying(200) USING \"OwnerId\"::text");
            migrationBuilder.Sql("ALTER TABLE saved_views ALTER COLUMN \"OwnerId\" TYPE character varying(200) USING \"OwnerId\"::text");
            migrationBuilder.Sql("ALTER TABLE locations ALTER COLUMN \"OwnerId\" TYPE character varying(200) USING \"OwnerId\"::text");
            migrationBuilder.Sql("ALTER TABLE collections ALTER COLUMN \"OwnerId\" TYPE character varying(200) USING \"OwnerId\"::text");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "OwnerId",
                table: "tags",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<Guid>(
                name: "OwnerId",
                table: "saved_views",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<Guid>(
                name: "OwnerId",
                table: "locations",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<Guid>(
                name: "OwnerId",
                table: "collections",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);
        }
    }
}
