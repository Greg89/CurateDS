import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { CollectionProvider } from "@/components/collection-context";
import { ShowcaseReports } from "@/components/showcase-reports";
import { insightsKey } from "@/lib/insights";
const id = "33333333-3333-4333-8333-333333333333";
function reports(
  types: { itemTypeId: string | null; name: string; count: number }[],
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData([...insightsKey(id), ""], {
    itemsByType: types,
    addedByMonth: Array.from({ length: 12 }, (_, month) => ({
      fromUtc: new Date(Date.UTC(2026, month, 1)).toISOString(),
      toUtc: new Date(Date.UTC(2026, month + 1, 1)).toISOString(),
      count: 0,
    })),
  });
  render(
    <QueryClientProvider client={client}>
      <CollectionProvider
        collection={{
          id,
          name: "Library",
          createdUtc: "2026-10-02T00:00:00Z",
          itemLabel: "book",
          itemsLabel: "books",
        }}
      >
        <ShowcaseReports
          settings={{
            collectionId: id,
            layout: "journal",
            showGrowth: true,
            showTypes: true,
          }}
        />
      </CollectionProvider>
    </QueryClientProvider>,
  );
}
it("explains empty reports and gives each UTC month an exact browse interval", () => {
  reports([]);
  expect(
    screen.getByText("No additions in these twelve months."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Add your first book to begin this report."),
  ).toBeInTheDocument();
  const link = screen.getByRole("link", { name: "January 2026: 0 books" });
  const params = new URL(link.getAttribute("href")!, "http://localhost")
    .searchParams;
  expect(params.get("createdAfter")).toBe("2026-01-01T00:00:00.000Z");
  expect(params.get("createdBeforeExclusive")).toBe("2026-02-01T00:00:00.000Z");
});
it("bounds the type summary, preserves the untyped drill-through, and discloses remaining groups", () => {
  reports([
    { itemTypeId: null, name: "No type", count: 9 },
    ...Array.from({ length: 7 }, (_, index) => ({
      itemTypeId: `type-${index}`,
      name: `Type ${index}`,
      count: index + 1,
    })),
  ]);
  const region = screen.getByRole("region", {
    name: "Collection by item type",
  });
  expect(within(region).getAllByRole("listitem")).toHaveLength(6);
  expect(within(region).getByRole("link", { name: /No type/ })).toHaveAttribute(
    "href",
    `/collections/${id}/browse?hasNoItemType=true`,
  );
  expect(
    within(region).getByRole("link", { name: "See all 8 groups in Insights" }),
  ).toHaveAttribute("href", `/collections/${id}/insights`);
  expect(within(region).queryByText("Type 0")).not.toBeInTheDocument();
});
