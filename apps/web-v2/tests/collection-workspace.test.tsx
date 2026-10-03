import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CollectionOverview,
  CollectionWorkspace,
} from "@/components/collection-workspace";
import { CollectionsList } from "@/components/collections-list";
import { collectionQueryKey } from "@/lib/collections";

const navigation = vi.hoisted(() => ({
  collectionId: "",
  section: "",
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () =>
    `/collections/${navigation.collectionId}${navigation.section}`,
  useParams: () => ({ collectionId: navigation.collectionId }),
  useRouter: () => ({ push: navigation.push }),
}));
const books = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Books",
  createdUtc: "2026-10-02T00:00:00Z",
};
const records = {
  ...books,
  id: "44444444-4444-4444-8444-444444444444",
  name: "Records",
};

function clientWith(data?: unknown) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  if (data !== undefined) client.setQueryData(collectionQueryKey, data);
  return client;
}
beforeEach(() => {
  navigation.collectionId = books.id;
  navigation.push.mockClear();
  navigation.section = "";
});

describe("collection workspace", () => {
  it("keeps showcase context while switching collections", async () => {
    navigation.section = "/showcase";
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={clientWith([books, records])}>
        <CollectionWorkspace>
          <p>Preview</p>
        </CollectionWorkspace>
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole("complementary", { name: "Showcase controls" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Collection" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← Back to collection" }),
    ).toHaveAttribute("href", `/collections/${books.id}`);
    await user.selectOptions(
      screen.getByLabelText("Your collection"),
      records.id,
    );
    expect(navigation.push).toHaveBeenCalledWith(
      `/collections/${records.id}/showcase`,
    );
  });
  it("derives nested context from the URL, including navigation back and forward", () => {
    const client = clientWith([books, records]);
    const view = () => (
      <QueryClientProvider client={client}>
        <CollectionWorkspace>
          <CollectionOverview />
        </CollectionWorkspace>
      </QueryClientProvider>
    );
    const { rerender } = render(view());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Books",
    );
    navigation.collectionId = records.id;
    rerender(view());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Records",
    );
    expect(screen.getByLabelText("Your collection")).toHaveValue(records.id);
    navigation.collectionId = books.id;
    rerender(view());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Books",
    );
  });
  it("switches using a collection route rather than storing a second active selection", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={clientWith([books, records])}>
        <CollectionWorkspace>
          <CollectionOverview />
        </CollectionWorkspace>
      </QueryClientProvider>,
    );
    await user.selectOptions(
      screen.getByLabelText("Your collection"),
      records.id,
    );
    expect(navigation.push).toHaveBeenCalledWith(`/collections/${records.id}`);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Books",
    );
  });
  it("does not substitute another collection when the route is missing or unauthorized", () => {
    navigation.collectionId = "55555555-5555-4555-8555-555555555555";
    render(
      <QueryClientProvider client={clientWith([books])}>
        <CollectionWorkspace>
          <CollectionOverview />
        </CollectionWorkspace>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Collection not found")).toBeInTheDocument();
    expect(screen.queryByText("Books")).not.toBeInTheDocument();
  });
  it("provides an empty collection state", () => {
    render(
      <QueryClientProvider client={clientWith([])}>
        <CollectionsList />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText("A little space for what you love."),
    ).toBeInTheDocument();
  });
  it("provides a loading state and a sign-in recovery link for an expired session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    render(
      <QueryClientProvider client={clientWith()}>
        <CollectionsList />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Sign in again" }),
    ).toHaveAttribute("href", "/auth/login?returnTo=%2Fcollections");
  });
  it("recovers from an API failure through retry", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(Response.json([books]));
    vi.stubGlobal("fetch", fetcher);
    render(
      <QueryClientProvider client={clientWith()}>
        <CollectionsList />
      </QueryClientProvider>,
    );
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: /Books/ })).toHaveAttribute(
      "href",
      `/collections/${books.id}`,
    );
  });
});
