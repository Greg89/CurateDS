"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  collectionQueryKey,
  collectionSchema,
  createCollectionSchema,
  saveCollectionData,
  type Collection,
} from "@/lib/collections";
import { SaveError } from "./save-error";

export function CollectionCreate() {
  const router = useRouter();
  const client = useQueryClient();
  const [validation, setValidation] = useState("");
  const pending = useRef(false);
  const mutation = useMutation({
    mutationFn: async (data: unknown) =>
      collectionSchema.parse(
        await saveCollectionData("/api/collections", data),
      ),
    onSuccess: (collection) => {
      client.setQueryData<Collection[]>(collectionQueryKey, (current) => [
        collection,
        ...(current ?? []),
      ]);
      void client.invalidateQueries({ queryKey: collectionQueryKey });
      router.push(`/collections/${collection.id}`);
    },
  });
  return (
    <section className="collections-page create-page">
      <Link className="back-link" href="/collections">
        ← Your collections
      </Link>
      <header className="page-heading">
        <span className="eyebrow">Make room for what you love</span>
        <h1>A collection of your own.</h1>
        <p>Start with a name. Give it a little personality, if you like.</p>
      </header>
      <form
        className="collection-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending.current) return;
          const parsed = createCollectionSchema.safeParse(
            Object.fromEntries(new FormData(event.currentTarget)),
          );
          if (!parsed.success) {
            setValidation(parsed.error.issues[0].message);
            return;
          }
          setValidation("");
          pending.current = true;
          try {
            await mutation.mutateAsync(parsed.data);
          } catch {
            /* Render safe error below; preserve input. */
          } finally {
            pending.current = false;
          }
        }}
      >
        <label>
          Collection name
          <input
            name="name"
            required
            minLength={3}
            maxLength={100}
            autoFocus
            placeholder="The reading room"
          />
        </label>
        <label>
          Hobby or category <span>(optional)</span>
          <input
            name="category"
            maxLength={100}
            placeholder="Books, records, little discoveries…"
          />
        </label>
        <label>
          Description <span>(optional)</span>
          <textarea
            name="description"
            maxLength={1000}
            rows={3}
            placeholder="What makes this collection yours?"
          />
        </label>
        <details>
          <summary>Add a cover and colour</summary>
          <label>
            Cover image URL <span>(optional)</span>
            <input
              name="coverImageUrl"
              type="url"
              maxLength={2048}
              placeholder="https://…"
              aria-describedby="cover-hint"
            />
          </label>
          <p id="cover-hint" className="field-hint">
            Use an HTTPS link to an image. Leave it blank for a simple
            illustrated cover.
          </p>
          <label>
            Collection colour
            <select name="color" defaultValue="forest">
              <option value="forest">Forest</option>
              <option value="clay">Clay</option>
              <option value="slate">Slate</option>
            </select>
          </label>
        </details>
        {validation && <p role="alert">{validation}</p>}
        {mutation.isError && <SaveError error={mutation.error} />}
        <button
          className="button"
          disabled={mutation.isPending || mutation.isSuccess}
        >
          {mutation.isPending ? "Creating…" : "Create collection"}
        </button>
      </form>
    </section>
  );
}
