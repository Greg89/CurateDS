"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCollection } from "./collection-context";
import { ItemFailure } from "./item-shared";
import { CollectionsError } from "@/lib/collections";
import { writeItem } from "@/lib/items";
import {
  fetchShowcaseSettings,
  showcaseKey,
  showcaseInputSchema,
  validateShowcaseSettings,
  type ShowcaseSettings as Settings,
} from "@/lib/showcase";

export function ShowcaseSettings() {
  const { id } = useCollection();
  const query = useQuery({
    queryKey: showcaseKey(id),
    queryFn: ({ signal }) => fetchShowcaseSettings(id, signal),
  });
  return (
    <section
      id="showcase"
      className="overview-settings"
      aria-label="Showcase settings"
    >
      <header>
        <span className="eyebrow">A different way to tell your story</span>
        <h2>Shape your showcase.</h2>
        <p>
          Choose a layout and the reports to include in your private preview.
          Cover, summary, highlights, and recent additions follow your overview
          choices above.
        </p>
      </header>
      {query.isPending ? (
        <p role="status">Loading showcase settings…</p>
      ) : query.isError ? (
        <ItemFailure
          collectionId={id}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        <ShowcaseEditor key={id} initial={query.data} />
      )}
    </section>
  );
}
function ShowcaseEditor({ initial }: { initial: Settings }) {
  const client = useQueryClient();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  function change(value: Partial<Settings>) {
    setDraft({ ...draft, ...value });
    setError(null);
    setMessage("");
  }
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (guard.current) return;
        guard.current = true;
        setBusy(true);
        setError(null);
        setMessage("");
        try {
          const data = validateShowcaseSettings(
            await writeItem(
              `/api/collections/${initial.collectionId}/showcase-settings`,
              "PUT",
              showcaseInputSchema.parse(draft),
            ),
            initial.collectionId,
          );
          setSaved(data);
          setDraft(data);
          client.setQueryData(showcaseKey(initial.collectionId), data);
          setMessage("Showcase saved.");
        } catch (caught) {
          setError(caught instanceof Error ? caught : new Error("Save failed"));
        } finally {
          guard.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy} className="showcase-layout-options">
        <legend>Layout</legend>
        {(
          [
            [
              "gallery",
              "Gallery",
              "A generous image grid, with your first highlight taking centre stage.",
            ],
            [
              "journal",
              "Journal",
              "A quieter reading view, with images beside each story.",
            ],
          ] as const
        ).map(([value, label, description]) => (
          <label key={value}>
            <input
              type="radio"
              name="showcase-layout"
              value={value}
              checked={draft.layout === value}
              onChange={() => change({ layout: value })}
            />
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset disabled={busy} className="overview-toggles">
        <legend>Optional reports</legend>
        <label>
          <input
            type="checkbox"
            checked={draft.showGrowth}
            onChange={(event) => change({ showGrowth: event.target.checked })}
          />
          Additions over twelve months
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.showTypes}
            onChange={(event) => change({ showTypes: event.target.checked })}
          />
          Collection by item type
        </label>
      </fieldset>
      <p>
        Reports use your current collection, including unpinned items. Deleted
        items are excluded.
      </p>
      {error && (
        <div role="alert" className="save-error">
          <p>
            {error instanceof CollectionsError && error.status === 401
              ? "Your session has ended. Sign in again before saving."
              : error instanceof CollectionsError &&
                  [403, 404].includes(error.status)
                ? "This collection is no longer available to your account."
                : "We couldn't save your showcase. Your choices are still here; please try again."}
          </p>
          {error instanceof CollectionsError && error.status === 401 && (
            <a href="/auth/login?returnTo=%2Fcollections">Sign in again</a>
          )}
        </div>
      )}
      <div className="settings-actions">
        <button className="button" disabled={busy || !dirty}>
          {busy ? "Saving showcase…" : "Save showcase"}
        </button>
        <button
          type="button"
          className="text-button"
          disabled={busy || !dirty}
          onClick={() => {
            setDraft(saved);
            setError(null);
            setMessage("");
          }}
        >
          Discard showcase changes
        </button>
      </div>
      {(message || dirty) && (
        <p role="status">{message || "You have unsaved showcase changes."}</p>
      )}
      <Link
        className="back-link"
        href={`/collections/${initial.collectionId}/showcase`}
      >
        Open saved showcase preview
      </Link>
    </form>
  );
}
