import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { App } from "@app/App";
import { renderApp } from "../test-utils";
import { defaultCollection, defaultItemSummary, server } from "../mocks/server";

describe("CatalogApp UI structure", () => {
  it("does not display the raw API base URL in the page header", async () => {
    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/overview`]
    });

    await screen.findByRole("heading", { name: "Collection Overview" });

    expect(screen.queryByText(/API:/i)).not.toBeInTheDocument();
  });

  it("renders tab navigation below the title row, not in a right-aligned side column", async () => {
    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/overview`]
    });

    await screen.findByRole("heading", { name: "Collection Overview" });

    // Wait for nav to appear — it renders only after the selected collection loads
    const nav = await screen.findByRole("navigation");

    // After the refactor the .top-bar-meta container is gone — nav must not live inside it
    expect(nav.closest(".top-bar-meta")).toBeNull();
  });

  it("collapse sidebar button uses a typographic chevron, not a raw angle bracket", async () => {
    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/overview`]
    });

    await screen.findByRole("heading", { name: "Collection Overview" });

    const collapseBtn = screen.getByRole("button", { name: "Collapse collection sidebar" });

    expect(collapseBtn.textContent?.trim()).not.toBe("<");
  });

  it("expand sidebar button uses a typographic chevron, not a raw angle bracket", async () => {
    const user = userEvent.setup();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/overview`]
    });

    await screen.findByRole("heading", { name: "Collection Overview" });

    await user.click(screen.getByRole("button", { name: "Collapse collection sidebar" }));

    const expandBtn = screen.getByRole("button", { name: "Expand collection sidebar" });

    expect(expandBtn.textContent?.trim()).not.toBe(">");
  });

  it("items workspace has a Filters toggle button and an Add Item button in the toolbar", async () => {
    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/items`]
    });

    // Toolbar only renders after selectedCollection loads from the API
    expect(await screen.findByRole("button", { name: /Filters/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Add Item/i })).toBeInTheDocument();
  });

  it("item filters panel is hidden by default and shown after clicking the Filters button", async () => {
    const user = userEvent.setup();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/items`]
    });

    // Wait for collection to load
    const filtersButton = await screen.findByRole("button", { name: /Filters/i });

    expect(screen.queryByRole("heading", { name: "Item Filters" })).not.toBeInTheDocument();

    await user.click(filtersButton);

    await screen.findByRole("heading", { name: "Item Filters" });
  });

  it("Filters button shows a count badge when search text is applied", async () => {
    const user = userEvent.setup();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/items`]
    });

    // Wait for toolbar to load with collection
    await screen.findByRole("button", { name: /Filters/i });

    await user.type(screen.getByPlaceholderText("Search items"), "Jazz");

    expect(screen.getByRole("button", { name: /Filters/i }).textContent).toContain("1");
  });

  it("clicking an item in the list opens the item detail drawer", async () => {
    const user = userEvent.setup();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/items`]
    });

    // Wait for collection and items to load
    const itemButton = await screen.findByRole("button", { name: /Kind of Blue/i });

    expect(screen.queryByRole("dialog", { name: /item detail/i })).not.toBeInTheDocument();

    await user.click(itemButton);

    await screen.findByRole("dialog", { name: /item detail/i });
  });

  it("clicking Add Item opens the item form drawer", async () => {
    const user = userEvent.setup();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/items`]
    });

    // Wait for toolbar to load with collection
    await user.click(await screen.findByRole("button", { name: /\+ Add Item/i }));

    await screen.findByRole("dialog", { name: /create item/i });
  });

  it("shows tag usage in settings organization summary when items are tagged", async () => {
    server.use(
      http.get("http://localhost:8080/tags", () =>
        HttpResponse.json([
          { id: "tag-jazz", name: "Jazz", key: "jazz", createdUtc: "2026-04-20T00:00:00Z" }
        ])
      ),
      http.get(
        `http://localhost:8080/collections/${defaultCollection.id}/items`,
        () =>
          HttpResponse.json({
            items: [{ ...defaultItemSummary, tags: ["Jazz"] }],
            totalCount: 1,
            page: 1,
            pageSize: 50,
            totalPages: 1
          })
      )
    );

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/settings`]
    });

    await screen.findByRole("heading", { name: "Collection Settings" });

    // Wait specifically for the usage subtitle that only renders once entries are computed
    await screen.findByText("Based on current item usage.");

    // The Top Tags section must not show the empty-state label
    const topTagsHeading = screen.getByRole("heading", { name: "Top Tags" });
    const topTagsCard = topTagsHeading.closest(".usage-card");
    expect(topTagsCard).not.toHaveTextContent("No usage yet.");
  });

  it("overview shows 4 metric cards and no Collection Shape or Selected Item panels", async () => {
    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/overview`]
    });

    // Wait for the overview quick-action links — these only render once selectedCollection loads
    await screen.findByRole("link", { name: /Browse Items/i });

    // 4 metric cards are rendered
    expect(document.querySelectorAll(".metric-card").length).toBe(4);

    // Removed panels must not be present
    expect(screen.queryByRole("heading", { name: "Collection Shape" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Selected Item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Saved Views" })).not.toBeInTheDocument();
  });

  it("overview has a Browse Items link and a Manage Settings link", async () => {
    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/overview`]
    });

    // Quick-action links load once collection resolves
    expect(await screen.findByRole("link", { name: /Browse Items/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage Settings/i })).toBeInTheDocument();
  });

  it("settings page shows the Organization Snapshot section", async () => {
    server.use(
      http.get("http://localhost:8080/tags", () =>
        HttpResponse.json([
          { id: "tag-jazz", name: "Jazz", key: "jazz", createdUtc: "2026-04-20T00:00:00Z" }
        ])
      )
    );

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/settings`]
    });

    await screen.findByRole("heading", { name: "Collection Settings" });

    // OrganizationSummary renders a "Top Tags" heading
    await screen.findByRole("heading", { name: "Top Tags" });
  });

  it("overview does not show the Organization Snapshot heading", async () => {
    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/overview`]
    });

    // Wait for overview to fully render before checking absent headings
    await screen.findByRole("link", { name: /Browse Items/i });

    expect(
      screen.queryByRole("heading", { name: "Organization Snapshot" })
    ).not.toBeInTheDocument();
  });

  it("items toolbar shows card and table view toggle buttons", async () => {
    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/items`]
    });

    await screen.findByRole("button", { name: /Filters/i });

    expect(screen.getByRole("button", { name: /card view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /table view/i })).toBeInTheDocument();
  });

  it("switching to table view renders items in a table and hides the card list", async () => {
    const user = userEvent.setup();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/items`]
    });

    // Wait for items to load in default card view
    await screen.findByRole("button", { name: /Kind of Blue/i });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /table view/i }));

    // Table appears and the item name is in a cell
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveTextContent("Kind of Blue");

    // Card-view buttons are gone
    expect(screen.queryByRole("button", { name: /Kind of Blue/i })).not.toBeInTheDocument();
  });

  it("clicking a table row opens the item detail drawer", async () => {
    const user = userEvent.setup();

    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/items`]
    });

    await screen.findByRole("button", { name: /Filters/i });
    await user.click(screen.getByRole("button", { name: /table view/i }));

    const cell = await screen.findByRole("cell", { name: /Kind of Blue/i });
    await user.click(cell);

    await screen.findByRole("dialog", { name: /item detail/i });
  });
});
