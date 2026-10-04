using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurateDS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShowcasePublications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "showcase_editions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Generation = table.Column<long>(type: "bigint", nullable: false),
                    PreparedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PublishedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Ready = table.Column<bool>(type: "boolean", nullable: false),
                    IncludesTypes = table.Column<bool>(type: "boolean", nullable: false),
                    Payload = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_showcase_editions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "showcase_publications",
                columns: table => new
                {
                    CollectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Generation = table.Column<long>(type: "bigint", nullable: false),
                    ActiveEditionId = table.Column<Guid>(type: "uuid", nullable: true),
                    PublishedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SuspensionReason = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_showcase_publications", x => x.CollectionId);
                });

            migrationBuilder.CreateTable(
                name: "showcase_assets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EditionId = table.Column<Guid>(type: "uuid", nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    SizeBytes = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_showcase_assets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_showcase_assets_showcase_editions_EditionId",
                        column: x => x.EditionId,
                        principalTable: "showcase_editions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_showcase_assets_EditionId",
                table: "showcase_assets",
                column: "EditionId");

            migrationBuilder.CreateIndex(
                name: "IX_showcase_editions_CollectionId_ExpiresUtc",
                table: "showcase_editions",
                columns: new[] { "CollectionId", "ExpiresUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_showcase_publications_Slug",
                table: "showcase_publications",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "showcase_assets");

            migrationBuilder.DropTable(
                name: "showcase_publications");

            migrationBuilder.DropTable(
                name: "showcase_editions");
        }
    }
}
