import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Collection, createCollection, listCollections } from "./api";
import { appConfig } from "./config";

export function App() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const collectionsQuery = useQuery({
    queryKey: ["collections"],
    queryFn: listCollections
  });

  const createCollectionMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCollectionMutation.mutate(name);
  }

  return (
    <main className="page-shell">
      <section className="intro-card">
        <p className="eyebrow">CurateDS</p>
        <h1>Create the first collection in your catalog.</h1>
        <p className="copy">
          This first vertical slice is intentionally narrow: create a
          collection, persist it in PostgreSQL through the API, and immediately
          see it show up in the UI.
        </p>
        <p className="meta">API base URL: {appConfig.apiBaseUrl}</p>
      </section>

      <section className="workspace-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>New Collection</h2>
            <p>Use a broad hobby label like Board Games, Vinyl, or Miniatures.</p>
          </div>

          <form className="collection-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Board Games"
                maxLength={100}
              />
            </label>

            <button
              className="primary-button"
              disabled={createCollectionMutation.isPending}
              type="submit"
            >
              {createCollectionMutation.isPending
                ? "Creating..."
                : "Create Collection"}
            </button>

            {createCollectionMutation.error ? (
              <p className="message error">
                {createCollectionMutation.error.message}
              </p>
            ) : null}
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Collections</h2>
            <p>Your saved collections will appear here as soon as they persist.</p>
          </div>

          {collectionsQuery.isLoading ? <p className="message">Loading...</p> : null}
          {collectionsQuery.isError ? (
            <p className="message error">{collectionsQuery.error.message}</p>
          ) : null}

          <CollectionList collections={collectionsQuery.data ?? []} />
        </section>
      </section>
    </main>
  );
}

function CollectionList({ collections }: { collections: Collection[] }) {
  if (collections.length === 0) {
    return (
      <div className="empty-state">
        <p>No collections yet.</p>
        <p>Create one to kick off the catalog.</p>
      </div>
    );
  }

  return (
    <ul className="collection-list">
      {collections.map((collection) => (
        <li className="collection-card" key={collection.id}>
          <h3>{collection.name}</h3>
          <p>
            Created{" "}
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short"
            }).format(new Date(collection.createdUtc))}
          </p>
        </li>
      ))}
    </ul>
  );
}
