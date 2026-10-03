"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCollection } from "./collection-context";
import {
  collectionQueryKey,
  collectionSchema,
  CollectionsError,
  type Collection,
} from "@/lib/collections";
import { vocabularyInputSchema } from "@/lib/customization";
import { writeItem } from "@/lib/items";
import { SaveError } from "./save-error";

export function VocabularySettings() {
  const collection = useCollection();
  const client = useQueryClient();
  const [saved, setSaved] = useState({
    itemLabel: collection.itemLabel || "item",
    itemsLabel: collection.itemsLabel || "items",
  });
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  return (
    <section className="overview-settings" aria-labelledby="vocabulary-title">
      <header>
        <span className="eyebrow">Words that fit</span>
        <h2 id="vocabulary-title">What do you collect?</h2>
        <p>
          Use your own words across this collection, such as book and books, or
          record and records.
        </p>
      </header>
      <form
        className="collection-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (guard.current) return;
          const parsed = vocabularyInputSchema.safeParse(draft);
          if (!parsed.success) {
            setMessage(parsed.error.issues[0].message);
            return;
          }
          guard.current = true;
          setBusy(true);
          setError(null);
          setMessage("");
          try {
            const updated = collectionSchema.parse(
              await writeItem(
                `/api/collections/${collection.id}/vocabulary`,
                "PUT",
                parsed.data,
              ),
            );
            if (updated.id !== collection.id) throw new CollectionsError(502);
            const values = {
              itemLabel: updated.itemLabel!,
              itemsLabel: updated.itemsLabel!,
            };
            setDraft(values);
            setSaved(values);
            client.setQueryData<Collection[]>(collectionQueryKey, (current) =>
              current?.map((entry) =>
                entry.id === updated.id ? updated : entry,
              ),
            );
            void client.invalidateQueries({ queryKey: collectionQueryKey });
            setMessage("Collection words saved.");
          } catch (cause) {
            setError(cause as Error);
          } finally {
            setBusy(false);
            guard.current = false;
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend>Collection words</legend>
          <label>
            One
            <input
              required
              maxLength={40}
              value={draft.itemLabel}
              onChange={(event) => {
                setDraft({ ...draft, itemLabel: event.target.value });
                setMessage("");
              }}
            />
          </label>
          <label>
            More than one
            <input
              required
              maxLength={40}
              value={draft.itemsLabel}
              onChange={(event) => {
                setDraft({ ...draft, itemsLabel: event.target.value });
                setMessage("");
              }}
            />
          </label>
          <p>
            Preview: Edit {draft.itemLabel || "item"} · Browse all{" "}
            {draft.itemsLabel || "items"}
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setDraft({ itemLabel: "item", itemsLabel: "items" });
              setMessage("");
            }}
          >
            Use item / items
          </button>
        </fieldset>
        {error && <SaveError error={error} />}
        <div className="settings-actions">
          <button className="button" disabled={!dirty || busy}>
            {busy ? "Saving…" : "Save collection words"}
          </button>
          <button
            type="button"
            className="text-button"
            disabled={!dirty || busy}
            onClick={() => {
              setDraft(saved);
              setError(null);
              setMessage("");
            }}
          >
            Discard word changes
          </button>
        </div>
        <p role="status">
          {message || (dirty ? "You have unsaved word changes." : "")}
        </p>
      </form>
    </section>
  );
}
