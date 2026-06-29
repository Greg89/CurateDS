import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { ItemDetailSummarySection } from "@app/catalog/components/ItemDetailSummarySection";
import { ItemHistorySection } from "@app/catalog/components/ItemHistorySection";
import { ItemMediaSection } from "@app/catalog/components/ItemMediaSection";
import { renderApp } from "../test-utils";
import { defaultCollection, defaultItemDetail, server } from "../mocks/server";

describe("Item detail sections", () => {
  it("renders core summary metadata and attribute values", () => {
    renderApp(
      <ItemDetailSummarySection
        item={defaultItemDetail}
        isEditing={false}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText(defaultItemDetail.name)).toBeInTheDocument();
    expect(screen.getByText("Qty 1")).toBeInTheDocument();
    expect(screen.getByText(/Location: None/i)).toBeInTheDocument();
    expect(screen.getByText("Release Year")).toBeInTheDocument();
    expect(screen.getByText("1959")).toBeInTheDocument();
  });

  it("opens the media lightbox when a thumbnail is clicked", async () => {
    const user = userEvent.setup();

    renderApp(
      <ItemMediaSection
        isUploadPending={false}
        mediaAssets={[
          {
            id: "asset-1",
            url: "https://example.com/cover.jpg",
            fileName: "cover.jpg",
            contentType: "image/jpeg",
            sizeBytes: 1234,
            isPrimary: true,
            uploadedUtc: "2026-01-01T00:00:00Z"
          }
        ]}
        onDeleteMedia={vi.fn()}
        onSetPrimaryMedia={vi.fn()}
        onUploadMedia={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "View cover.jpg" }));

    expect(screen.getByRole("dialog", { name: "Image lightbox" })).toBeInTheDocument();
  });

  it("renders history events returned by the API", async () => {
    server.use(
      http.get(
        `http://localhost:8080/collections/${defaultCollection.id}/items/${defaultItemDetail.id}/events`,
        () =>
          HttpResponse.json([
            {
              id: "event-1",
              itemId: defaultItemDetail.id,
              collectionId: defaultCollection.id,
              eventType: "Updated",
              occurredUtc: "2026-04-20T01:00:00Z",
              occurredBy: "user@example.com",
              notes: "Adjusted quantity"
            }
          ])
      )
    );

    renderApp(
      <ItemHistorySection
        collectionId={defaultCollection.id}
        itemId={defaultItemDetail.id}
      />
    );

    expect(await screen.findByText("Item updated")).toBeInTheDocument();
    expect(screen.getByText("Adjusted quantity")).toBeInTheDocument();
  });
});
