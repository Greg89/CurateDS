import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CollectionProvider } from "@/components/collection-context";
import { ShowcaseSettings } from "@/components/showcase-settings";
import { showcaseKey, validateShowcaseSettings } from "@/lib/showcase";

const id = "33333333-3333-4333-8333-333333333333";
const initial = {
  collectionId: id,
  layout: "gallery",
  showGrowth: false,
  showTypes: false,
};
function editor() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(showcaseKey(id), initial);
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
        <ShowcaseSettings />
      </CollectionProvider>
    </QueryClientProvider>,
  );
  return client;
}
describe("showcase choices", () => {
  it("preserves a failed draft, saves only showcase choices, and discards back to the last save", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(
        Response.json({ ...initial, layout: "journal", showGrowth: true }),
      );
    vi.stubGlobal("fetch", fetcher);
    const client = editor();
    await user.click(screen.getByRole("radio", { name: /Journal/ }));
    await user.click(
      screen.getByRole("checkbox", { name: "Additions over twelve months" }),
    );
    await user.click(screen.getByRole("button", { name: "Save showcase" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your choices are still here",
    );
    expect(screen.getByRole("radio", { name: /Journal/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save showcase" }));
    expect(await screen.findByText("Showcase saved.")).toBeInTheDocument();
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
      layout: "journal",
      showGrowth: true,
      showTypes: false,
    });
    expect(client.getQueryData(showcaseKey(id))).toEqual({
      ...initial,
      layout: "journal",
      showGrowth: true,
    });
    await user.click(screen.getByRole("radio", { name: /Gallery/ }));
    await user.click(
      screen.getByRole("button", { name: "Discard showcase changes" }),
    );
    expect(screen.getByRole("radio", { name: /Journal/ })).toBeChecked();
  });
  it("rejects foreign settings and unknown layouts", () => {
    expect(() =>
      validateShowcaseSettings(
        { ...initial, collectionId: "44444444-4444-4444-8444-444444444444" },
        id,
      ),
    ).toThrow();
    expect(() =>
      validateShowcaseSettings({ ...initial, layout: "unknown" }, id),
    ).toThrow();
  });
  it("retains choices when the session expires and offers sign-in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    const user = userEvent.setup();
    editor();
    await user.click(screen.getByRole("radio", { name: /Journal/ }));
    await user.click(screen.getByRole("button", { name: "Save showcase" }));
    expect(
      await screen.findByRole("link", { name: "Sign in again" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Journal/ })).toBeChecked();
  });
});
