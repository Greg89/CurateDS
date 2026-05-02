import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { App } from "@app/App";
import { renderApp } from "../test-utils";
import { defaultCollection, server } from "../mocks/server";

const apiBaseUrl = "http://localhost:8080";

function stubReports() {
  server.use(
    http.get(`${apiBaseUrl}/collections/:collectionId/reports`, () =>
      HttpResponse.json({
        itemsByLocation: [
          { locationId: "loc-1", locationName: "Office Shelf", count: 4 },
          { locationId: null, locationName: "No Location", count: 2 }
        ],
        itemsByTag: [{ tagId: "tag-1", tagName: "Wishlist", count: 3 }]
      })
    ),
    http.get(`${apiBaseUrl}/collections/:collectionId/activity`, () =>
      HttpResponse.json({
        events: [
          {
            eventId: "evt-1",
            itemId: "item-1",
            itemName: "Foundation",
            eventType: "Created",
            occurredUtc: "2026-04-29T20:41:41Z",
            occurredBy: "test-user-id",
            notes: null
          }
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1
      })
    )
  );
}

describe("ReportsPage", () => {
  it("renders aggregate reports inside cards with the .reports-card class", async () => {
    stubReports();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/reports`]
    });

    const heading = await screen.findByRole("heading", { name: /Items by Location/i });
    expect(heading.closest(".reports-card")).not.toBeNull();
  });

  it("renders the activity feed inside an .reports-activity-card", async () => {
    stubReports();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/reports`]
    });

    const heading = await screen.findByRole("heading", { name: /Recent Activity/i });
    expect(heading.closest(".reports-activity-card")).not.toBeNull();
  });

  it("clicking a location row navigates to items with the locationId query param", async () => {
    const user = userEvent.setup();
    stubReports();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/reports`]
    });

    const locationButton = await screen.findByRole("button", { name: "Office Shelf" });
    await user.click(locationButton);

    // After consuming the URL drill-in param, items page should be active
    await screen.findByRole("button", { name: /Filters/i });
  });

  it("clicking a tag row navigates to items with the tagId query param", async () => {
    const user = userEvent.setup();
    stubReports();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/reports`]
    });

    const tagButton = await screen.findByRole("button", { name: "Wishlist" });
    await user.click(tagButton);

    await screen.findByRole("button", { name: /Filters/i });
  });

  it("each activity row has a 'View item' button that navigates to the items page", async () => {
    const user = userEvent.setup();
    stubReports();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/reports`]
    });

    const activityHeading = await screen.findByRole("heading", { name: /Recent Activity/i });
    const card = activityHeading.closest(".reports-activity-card")!;
    const viewButton = await within(card as HTMLElement).findByRole("button", { name: /View item/i });

    await user.click(viewButton);

    await screen.findByRole("button", { name: /Filters/i });
  });
});
