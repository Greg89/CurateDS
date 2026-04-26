using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurateDS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "tags",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "tags",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedUtc",
                table: "tags",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "tags",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedUtc",
                table: "tags",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "locations",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "locations",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedUtc",
                table: "locations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "locations",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedUtc",
                table: "locations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "items",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "items",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedUtc",
                table: "items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "items",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "collections",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "collections",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedUtc",
                table: "collections",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "collections",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedUtc",
                table: "collections",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "attribute_definitions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "attribute_definitions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedUtc",
                table: "attribute_definitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "attribute_definitions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedUtc",
                table: "attribute_definitions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "DeletedUtc",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "UpdatedUtc",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "DeletedUtc",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "UpdatedUtc",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "items");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                table: "items");

            migrationBuilder.DropColumn(
                name: "DeletedUtc",
                table: "items");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "items");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "DeletedUtc",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "UpdatedUtc",
                table: "collections");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "attribute_definitions");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                table: "attribute_definitions");

            migrationBuilder.DropColumn(
                name: "DeletedUtc",
                table: "attribute_definitions");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "attribute_definitions");

            migrationBuilder.DropColumn(
                name: "UpdatedUtc",
                table: "attribute_definitions");
        }
    }
}
