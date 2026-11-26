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
import {
  CollectionIdentityFields,
  emptyIdentity,
} from "./collection-identity-fields";
import { SaveError } from "./save-error";

export function CollectionCreate() {
  const [draft, setDraft] = useState(emptyIdentity);
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
        <CollectionIdentityFields value={draft} onChange={setDraft} />
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
