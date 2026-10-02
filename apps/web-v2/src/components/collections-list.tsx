"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collectionQueryKey, fetchCollections } from "@/lib/collections";
import { CollectionFailure, CollectionLoading } from "./collection-states";

export function CollectionsList() {
  const query = useQuery({
    queryKey: collectionQueryKey,
    queryFn: fetchCollections,
  });
  if (query.isPending) return <CollectionLoading />;
  if (query.isError)
    return (
      <CollectionFailure
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  return (
    <section className="collections-page">
      <header className="page-heading">
        <span className="eyebrow">Your personal archive</span>
        <h1>Things worth keeping.</h1>
        <p>Every collection has a story. Pick one to step inside.</p>
      </header>
      {query.data.length === 0 ? (
        <div className="state-panel">
          <span className="large-mark" aria-hidden="true">
            ＋
          </span>
          <h2>A little space for what you love.</h2>
          <p>
            You don't have any collections yet. Collections you create in
            CurateDS will appear here.
          </p>
        </div>
      ) : (
        <div className="collection-grid">
          {query.data.map((collection, index) => (
            <Link
              className="collection-card"
              href={`/collections/${collection.id}`}
              key={collection.id}
            >
              <div
                className={`collection-art tone-${index % 3}`}
                aria-hidden="true"
              >
                <span>{collection.name.slice(0, 1).toUpperCase()}</span>
                <i />
                <i />
                <i />
              </div>
              <div className="card-caption">
                <div>
                  <span className="eyebrow">Personal collection</span>
                  <h2>{collection.name}</h2>
                </div>
                <span className="arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
