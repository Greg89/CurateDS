"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchViews,
  restoreView,
  serializeView,
  viewsKey,
  savedViewSchema,
} from "@/lib/insights";
import { writeItem } from "@/lib/items";
import { CollectionsError } from "@/lib/collections";
import { SaveError } from "./save-error";

export function SavedViews({
  collectionId,
  search,
}: {
  collectionId: string;
  search?: string;
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: viewsKey(collectionId),
    queryFn: ({ signal }) => fetchViews(collectionId, signal),
  });
  const [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null),
    [confirm, setConfirm] = useState<string | null>(null),
    [message, setMessage] = useState("");
  const guard = useRef(false),
    input = useRef<HTMLInputElement>(null);
  async function save(remove?: string) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const result = await writeItem(
        `/api/collections/${collectionId}/saved-views${remove ? "/" + remove : ""}`,
        remove ? "DELETE" : "POST",
        remove
          ? undefined
          : {
              name: name.trim(),
              filtersJson: serializeView(new URLSearchParams(search)),
            },
      );
      if (
        !remove &&
        savedViewSchema.parse(result).collectionId !== collectionId
      )
        throw new CollectionsError(502);
      await client.invalidateQueries({ queryKey: viewsKey(collectionId) });
      setConfirm(null);
      if (!remove) setName("");
      setMessage(remove ? "Saved view removed." : "View saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Save failed"));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="insight-panel saved-views">
      <h2>Views to come back to</h2>
      <p>Save a useful combination of filters and sorting from Browse.</p>
      {search !== undefined && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="save-view-form"
        >
          <label>
            View name
            <input
              ref={input}
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
            />
          </label>
          <button className="button" disabled={busy || !name.trim()}>
            Save current view
          </button>
        </form>
      )}
      {error && <SaveError error={error} />}
      <p role="status">{message}</p>
      {query.isPending ? (
        <p>Loading saved views…</p>
      ) : query.isError ? (
        <p role="alert">
          Saved views couldn't be loaded.{" "}
          <button onClick={() => void query.refetch()}>Retry views</button>
        </p>
      ) : query.data.length ? (
        <ul className="saved-view-list">
          {query.data.map((view) => {
            let href: string | undefined;
            try {
              href = `/collections/${collectionId}/browse?${restoreView(view.filtersJson)}`;
            } catch {
              /* Keep unsupported views visible and removable. */
            }
            return (
              <li key={view.id}>
                <div>
                  {href ? (
                    <Link href={href}>{view.name} ↗</Link>
                  ) : (
                    <span>{view.name} — filters aren't supported here.</span>
                  )}
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setConfirm(view.id)}
                    aria-label={`Remove view ${view.name}`}
                  >
                    Remove
                  </button>
                </div>
                {confirm === view.id && (
                  <div className="confirm-panel">
                    <p>
                      Remove this saved view? Your items will stay in the
                      collection.
                    </p>
                    <button
                      autoFocus
                      disabled={busy}
                      onClick={() => void save(view.id)}
                    >
                      Remove saved view
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setConfirm(null);
                        input.current?.focus();
                      }}
                    >
                      Keep view
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No saved views yet.</p>
      )}
    </section>
  );
}
