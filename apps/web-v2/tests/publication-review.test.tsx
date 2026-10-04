import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CollectionProvider } from "@/components/collection-context";
import { PublicationReview } from "@/components/publication-review";
import { PublicShowcaseView } from "@/components/public-showcase-view";
import type { PublicShowcase } from "@/lib/publication";
const id = "33333333-3333-4333-8333-333333333333";
const token = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const showcase: PublicShowcase = {
  version: 1,
  slug: "reading-room",
  revisionToken: token,
  asOfUtc: "2026-10-04T12:00:00Z",
  publishedUtc: null,
  title: "Reviewed title",
  category: null,
  description: null,
  layout: "journal",
  color: "slate",
  itemLabel: "book",
  itemsLabel: "books",
  showCover: false,
};
const status = {
  state: "unpublished",
  slug: null,
  generation: 0,
  revisionToken: null,
  publishedUtc: null,
  suspensionReason: null,
};
it("disables publishing an expired review while retaining its exact content", async () => {
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) =>
    Response.json(
      init?.method === "POST"
        ? {
            token,
            expiresUtc: "2020-01-01T00:00:00Z",
            generation: 0,
            showcase,
            notices: [],
          }
        : status,
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CollectionProvider
        collection={{
          id,
          name: "Live owner title",
          createdUtc: showcase.asOfUtc,
          itemLabel: "item",
          itemsLabel: "items",
        }}
      >
        <PublicationReview />
      </CollectionProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Prepare review" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Reviewed title" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Live owner title" }),
  ).not.toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Publish this edition" }),
    ).toBeDisabled(),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "review has expired or the publication changed",
  );
  expect(
    screen.getByLabelText("I reviewed this edition and want to make it public."),
  ).toBeDisabled();
  expect(fetcher.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(
    false,
  );
});
it("renders plain text, truncation and bounded-report notices without owner navigation", () => {
  const { container } = render(
    <PublicShowcaseView
      showcase={{
        ...showcase,
        title: "<script>private()</script>",
        highlights: [
          {
            token,
            name: "<img src=x onerror=private()>",
            description: "A shortened story",
            descriptionTruncated: true,
            imageToken: null,
          },
        ],
        types: { groups: [{ name: "Books", count: 2 }], totalGroups: 9 },
      }}
      imageUrl={() => "/checked-image"}
    />,
  );
  expect(container.querySelector("script,img,a")).toBeNull();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "<script>private()</script>",
  );
  expect(
    screen.getByText("Description shortened for this edition."),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("region", { name: "Item types" })).getByText(
      /largest of 9 groups/,
    ),
  ).toBeInTheDocument();
});
