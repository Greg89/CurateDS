"use client";
import { useCollection } from "./collection-context";
import { vocabulary } from "@/lib/customization";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPresentation,
  overviewKey,
  presentationKey,
  presentationInputSchema,
  validatePresentation,
  CollectionsError,
  type Presentation,
  type RecentItem,
} from "@/lib/collections";
import { itemListSchema, readJson, writeItem } from "@/lib/items";
import { ItemFailure } from "./item-shared";

export function OverviewSettings({ collectionId }: { collectionId: string }) {
  const query = useQuery({
    queryKey: presentationKey(collectionId),
    queryFn: ({ signal }) => fetchPresentation(collectionId, signal),
  });
  return (
    <section id="overview" className="overview-settings">
      <header>
        <span className="eyebrow">A place for your favourites</span>
        <h2>Shape your overview.</h2>
        <p>
          Choose what appears when you open this collection. These choices stay
          private to your workspace.
        </p>
      </header>
      {query.isPending ? (
        <p role="status">Loading overview settings…</p>
      ) : query.isError ? (
        <ItemFailure
          collectionId={collectionId}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        <PresentationEditor
          key={collectionId}
          collectionId={collectionId}
          initial={query.data}
        />
      )}
    </section>
  );
}
function asInput(data: Presentation) {
  return {
    showCover: data.showCover,
    showSummary: data.showSummary,
    showPinnedItems: data.showPinnedItems,
    showRecentItems: data.showRecentItems,
    pinnedItemIds: data.pinnedItems.map((item) => item.id),
  };
}
function PresentationEditor({
  collectionId,
  initial,
}: {
  collectionId: string;
  initial: Presentation;
}) {
  const words = vocabulary(useCollection());
  const client = useQueryClient();
  const [saved, setSaved] = useState(initial);
  const [flags, setFlags] = useState(asInput(initial));
  const [pins, setPins] = useState(initial.pinnedItems);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState("");
  const input = { ...flags, pinnedItemIds: pins.map((item) => item.id) };
  const dirty = JSON.stringify(input) !== JSON.stringify(asInput(saved));
  const candidates = useQuery({
    queryKey: ["pin-candidates", collectionId, term, page],
    enabled: picker,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        searchText: term,
        page: String(page),
        pageSize: "6",
        sortBy: "name",
        sortDirection: "asc",
      });
      const data = await readJson(
        `/api/collections/${collectionId}/items?${params}`,
        itemListSchema,
        signal,
      );
      if (data.items.some((item) => item.collectionId !== collectionId))
        throw new CollectionsError(502);
      return data;
    },
  });
  function changed() {
    setError(null);
    setMessage("");
  }
  function move(index: number, offset: number) {
    const result = [...pins];
    [result[index], result[index + offset]] = [
      result[index + offset],
      result[index],
    ];
    setPins(result);
    changed();
  }
  return (
    <div className="presentation-editor">
      <fieldset disabled={busy} className="overview-toggles">
        <legend>Sections to show</legend>
        {(
          [
            ["showCover", "Cover and story"],
            ["showSummary", "Summary counts"],
            ["showPinnedItems", `Pinned ${words.many}`],
            ["showRecentItems", "Recently added"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={flags[key]}
              onChange={(event) => {
                setFlags({ ...flags, [key]: event.target.checked });
                changed();
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <h3>Your pinned {words.many}</h3>
      <p>
        Choose up to six {words.many}. Move them into the order you want; hiding
        the section keeps your choices.
      </p>
      {pins.length ? (
        <ol className="pin-list">
          {pins.map((item, index) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <div>
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Move ${item.name} earlier`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || index === pins.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Move ${item.name} later`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPins(pins.filter((pin) => pin.id !== item.id));
                    changed();
                  }}
                  aria-label={`Unpin ${item.name}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p>No pinned {words.many} yet.</p>
      )}
      <button
        type="button"
        className="text-button"
        disabled={busy}
        aria-expanded={picker}
        onClick={() => setPicker(!picker)}
      >
        {picker ? `Close ${words.one} finder` : `Find ${words.many} to pin`}
      </button>
      {pins.length === 6 && (
        <p>You have six pinned {words.many}. Remove one to choose another.</p>
      )}
      {picker && (
        <section
          className="pin-picker"
          aria-label={`Find ${words.many} to pin`}
        >
          <form
            className="pin-search"
            onSubmit={(event) => {
              event.preventDefault();
              setTerm(search.trim());
              setPage(1);
            }}
          >
            <label>
              Search your {words.many}
              <input
                value={search}
                maxLength={200}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button className="button">Search {words.many}</button>
          </form>
          {candidates.isPending ? (
            <p role="status">Finding {words.many}…</p>
          ) : candidates.isError ? (
            <ItemFailure
              collectionId={collectionId}
              error={candidates.error}
              retry={() => void candidates.refetch()}
            />
          ) : (
            <>
              {candidates.data.items.length ? (
                <ul className="pin-candidates">
                  {candidates.data.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.name}</span>
                      <button
                        type="button"
                        disabled={
                          busy ||
                          pins.length === 6 ||
                          pins.some((pin) => pin.id === item.id)
                        }
                        onClick={() => {
                          setPins([...pins, item as RecentItem]);
                          changed();
                        }}
                        aria-label={`Pin ${item.name}`}
                      >
                        {pins.some((pin) => pin.id === item.id)
                          ? "Pinned"
                          : "Pin"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  No {words.many} match. Try another search or add to this
                  collection.
                </p>
              )}
              <nav className="pagination" aria-label="Item finder pages">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous {words.many}
                </button>
                <span>
                  Page {page} of {Math.max(1, candidates.data.totalPages)}
                </span>
                <button
                  type="button"
                  disabled={page >= candidates.data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next {words.many}
                </button>
              </nav>
            </>
          )}
        </section>
      )}
      {error && (
        <div role="alert" className="save-error">
          <p>
            {error instanceof CollectionsError && error.status === 400
              ? "A selected item may have been removed. Remove it from your choices and try again."
              : error instanceof CollectionsError && error.status === 401
                ? "Your session has ended. Sign in again before saving."
                : "We couldn't save your overview. Your choices are still here; please try again."}
          </p>
          {error instanceof CollectionsError && error.status === 401 && (
            <a href="/auth/login?returnTo=%2Fcollections">Sign in again</a>
          )}
        </div>
      )}
      <div className="settings-actions">
        <button
          className="button"
          disabled={busy || !dirty}
          onClick={async () => {
            if (guard.current) return;
            guard.current = true;
            setBusy(true);
            changed();
            try {
              const data = validatePresentation(
                await writeItem(
                  `/api/collections/${collectionId}/presentation`,
                  "PUT",
                  presentationInputSchema.parse(input),
                ),
                collectionId,
              );
              setSaved(data);
              setFlags(asInput(data));
              setPins(data.pinnedItems);
              client.setQueryData(presentationKey(collectionId), data);
              await client.invalidateQueries({
                queryKey: overviewKey(collectionId),
              });
              setMessage("Overview saved.");
            } catch (caught) {
              setError(
                caught instanceof Error ? caught : new Error("Save failed"),
              );
            } finally {
              guard.current = false;
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving overview…" : "Save overview"}
        </button>
        <button
          type="button"
          className="text-button"
          disabled={busy || !dirty}
          onClick={() => {
            setFlags(asInput(saved));
            setPins(saved.pinnedItems);
            changed();
          }}
        >
          Discard overview changes
        </button>
      </div>
      {(message || dirty) && (
        <p role="status">{message || "You have unsaved overview changes."}</p>
      )}
    </div>
  );
}
