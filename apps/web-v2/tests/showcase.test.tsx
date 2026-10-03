import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollectionProvider } from "@/components/collection-context";
import { CollectionShowcase } from "@/components/collection-showcase";
import { showcaseKey } from "@/lib/showcase";
import { overviewKey, type Collection } from "@/lib/collections";

const collection: Collection = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Library",
  createdUtc: "2026-10-02T00:00:00Z",
  itemLabel: "book",
  itemsLabel: "books",
};
const first = {
  id: "11111111-1111-4111-8111-111111111111",
  collectionId: collection.id,
  name: "Garden notes",
  description: "A first edition",
  createdUtc: collection.createdUtc,
  primaryImageUrl: null,
};
const second = {
  ...first,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Coastal notes",
};
function overview() {
  return {
    summary: { totalItems: 2, totalMediaAssets: 0, tagsUsed: 1 },
    items: [first, second],
    presentation: {
      showCover: true,
      showSummary: true,
      showPinnedItems: true,
      showRecentItems: true,
      pinnedItems: [second],
    },
  };
}
function preview(data?: ReturnType<typeof overview>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(showcaseKey(collection.id), {
    collectionId: collection.id,
    layout: "gallery",
    showGrowth: false,
    showTypes: false,
  });
  if (data) client.setQueryData(overviewKey(collection.id), data);
  render(
    <QueryClientProvider client={client}>
      <CollectionProvider collection={collection}>
        <CollectionShowcase />
      </CollectionProvider>
    </QueryClientProvider>,
  );
}
describe("private showcase presentation", () => {
  it("preserves pin order and removes visible highlights from recent additions", () => {
    const data = overview();
    data.presentation.pinnedItems = [second, first];
    preview(data);
    expect(
      within(screen.getByRole("region", { name: "Selected with care." }))
        .getAllByRole("heading", { level: 3 })
        .map((node) => node.textContent),
    ).toEqual([second.name, first.name]);
    expect(
      screen.queryByRole("region", { name: "The latest finds." }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("note", { name: "Private preview" }),
    ).toHaveTextContent("Only you");
    expect(
      screen.getByRole("link", { name: "Explore all books" }),
    ).toHaveAttribute("href", `/collections/${collection.id}/browse`);
  });
  it("keeps hidden pins eligible for the recent section", () => {
    const data = overview();
    data.presentation.showPinnedItems = false;
    preview(data);
    expect(
      screen.queryByRole("region", { name: "Selected with care." }),
    ).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "The latest finds." }),
      ).getAllByRole("heading", { level: 3 }),
    ).toHaveLength(2);
  });
  it("respects every section flag while retaining identity and a way back", () => {
    const data = overview();
    Object.assign(data.presentation, {
      showCover: false,
      showSummary: false,
      showPinnedItems: false,
      showRecentItems: false,
    });
    preview(data);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Library",
    );
    expect(document.querySelector(".collection-cover")).toBeNull();
    expect(
      screen.queryByLabelText("Collection at a glance"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Garden notes")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Choose what appears" }),
    ).toHaveAttribute(
      "href",
      `/collections/${collection.id}/settings#overview`,
    );
  });
  it("gives an empty collection a useful starting point", () => {
    const data = overview();
    data.summary.totalItems = 0;
    data.items = [];
    data.presentation.pinnedItems = [];
    preview(data);
    expect(
      screen.getByRole("heading", { name: "A collection taking shape." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add your first book" }),
    ).toHaveAttribute("href", `/collections/${collection.id}/items/new`);
  });
  it("shows sign-in recovery when presentation access expires", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    preview();
    expect(await screen.findByRole("alert")).toHaveTextContent("out of reach");
    expect(
      screen.getByRole("link", { name: "Sign in again" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
