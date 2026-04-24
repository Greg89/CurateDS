import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { App } from "@app/App";
import { renderApp } from "./test-utils";
import {
  defaultCollection,
  defaultItemSummary,
  server
} from "./mocks/server";

describe("App routing", () => {
  it("shows the empty selection state when no collections exist", async () => {
    server.use(
      http.get("http://localhost:8080/collections", () => HttpResponse.json([]))
    );

    renderApp(<App />);

    expect(await screen.findByText("No collections yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Create a collection from the sidebar to start shaping the catalog.")
    ).toBeInTheDocument();
  });

  it("renders the routed items workspace for a selected collection", async () => {
    renderApp(<App />, {
      initialEntries: [`/collections/${defaultCollection.id}/items`]
    });

    expect(await screen.findByRole("heading", { name: "Items Workspace" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Item Filters" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: defaultItemSummary.name })).toBeInTheDocument();
  });

  it("creates a collection from the sidebar and navigates into the overview route", async () => {
    const user = userEvent.setup();
    const createdCollection = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Books",
      createdUtc: "2026-04-21T00:00:00Z"
    };

    server.use(
      http.get("http://localhost:8080/collections", () =>
        HttpResponse.json([defaultCollection, createdCollection])
      )
    );

    renderApp(<App />);

    await user.type(screen.getByLabelText("New Collection"), "Books");
    await user.click(screen.getByRole("button", { name: "Create Collection" }));

    expect(await screen.findByRole("heading", { name: "Collection Overview" })).toBeInTheDocument();
    expect(await screen.findByText("Books")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("Books").length).toBeGreaterThan(0);
    });
  });
});
