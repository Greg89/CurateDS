"use client";
import Link from "next/link";
import { OverviewSettings } from "./overview-settings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useCollection } from "./collection-context";
import { CollectionCover } from "./collection-cover";
import {
  CollectionIdentityFields,
  type IdentityDraft,
} from "./collection-identity-fields";
import {
  collectionQueryKey,
  collectionSchema,
  createCollectionSchema,
  CollectionsError,
  type Collection,
} from "@/lib/collections";

function identity(collection: Collection): IdentityDraft {
  return {
    name: collection.name,
    category: collection.category || "",
    description: collection.description || "",
    coverImageUrl: collection.coverImageUrl || "",
    color: collection.color || "forest",
  };
}

export function CollectionSettings() {
  const collection = useCollection();
  const client = useQueryClient();
  const [draft, setDraft] = useState(() => identity(collection));
  const [saved, setSaved] = useState(() => identity(collection));
  const [validation, setValidation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const busy = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const mutation = useMutation({
    mutationFn: async (data: unknown) => {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new CollectionsError(response.status);
      const updated = collectionSchema.parse(await response.json());
      if (updated.id !== collection.id) throw new CollectionsError(502);
      return updated;
    },
    onSuccess: (updated) => {
      const values = identity(updated);
      setDraft(values);
      setSaved(values);
      setConfirmed(true);
      client.setQueryData<Collection[]>(collectionQueryKey, (current) =>
        current?.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      void client.invalidateQueries({ queryKey: collectionQueryKey });
    },
  });
  return (
    <section data-color={draft.color} className="collection-settings">
      <header className="collection-heading">
        <span className="eyebrow">Your collection / Settings</span>
        <h1>Make it yours.</h1>
        <p>Give your collection a name, a story, and a little colour.</p>
      </header>
      <div className="settings-layout">
        <form
          className="collection-form"
          ref={form}
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy.current) return;
            setConfirmed(false);
            const parsed = createCollectionSchema.safeParse(draft);
            if (!parsed.success) {
              const issue = parsed.error.issues[0];
              setValidation(issue.message);
              const input = form.current?.elements.namedItem(
                String(issue.path[0]),
              );
              if (input instanceof HTMLElement) {
                input.closest("details")?.setAttribute("open", "");
                input.focus();
              }
              return;
            }
            setValidation("");
            busy.current = true;
            try {
              await mutation.mutateAsync(parsed.data);
            } catch {
              /* Keep the draft so the user can retry. */
            } finally {
              busy.current = false;
            }
          }}
        >
          <fieldset disabled={mutation.isPending}>
            <legend>Collection identity</legend>
            <CollectionIdentityFields
              expanded
              value={draft}
              onChange={(value) => {
                setDraft(value);
                setConfirmed(false);
                setValidation("");
                mutation.reset();
              }}
            />
          </fieldset>
          {validation && <p role="alert">{validation}</p>}
          {mutation.isError && (
            <div role="alert" className="save-error">
              <p>
                {mutation.error instanceof CollectionsError &&
                mutation.error.status === 401
                  ? "Your session has ended. Sign in again before saving."
                  : mutation.error instanceof CollectionsError &&
                      [403, 404].includes(mutation.error.status)
                    ? "This collection is no longer available to your account."
                    : "We couldn't save your collection. Your changes are still here; please try again."}
              </p>
              {mutation.error instanceof CollectionsError &&
                mutation.error.status === 401 && (
                  <a href="/auth/login?returnTo=%2Fcollections">
                    Sign in again
                  </a>
                )}
            </div>
          )}
          <div className="settings-actions">
            <button className="button" disabled={!dirty || mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={!dirty || mutation.isPending}
              onClick={() => {
                setDraft(saved);
                setValidation("");
                setConfirmed(false);
                mutation.reset();
              }}
            >
              Discard changes
            </button>
          </div>
          <p role="status">
            {confirmed
              ? "Collection settings saved."
              : dirty
                ? "You have unsaved changes."
                : ""}
          </p>
          <Link className="back-link" href={`/collections/${collection.id}`}>
            Back to overview
          </Link>
        </form>
        <aside className="settings-preview" aria-label="Collection preview">
          <span className="eyebrow">Preview</span>
          <CollectionCover
            key={draft.coverImageUrl}
            url={draft.coverImageUrl}
            name={draft.name || "Your collection"}
          />
          <p className="eyebrow">{draft.category || "Your collection"}</p>
          <h2>{draft.name || "Your collection"}</h2>
          <p>
            {draft.description ||
              "Collected with care. Yours to make your own."}
          </p>
          <small>
            Changes appear throughout your collection after you save.
          </small>
        </aside>
      </div>
      <OverviewSettings collectionId={collection.id} />
    </section>
  );
}
