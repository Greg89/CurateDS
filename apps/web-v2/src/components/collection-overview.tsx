"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCollection } from "./collection-context";
import { CollectionCover } from "./collection-cover";
import {
  CollectionsError,
  fetchOverview,
  overviewKey,
} from "@/lib/collections";

export function CollectionOverview() {
  const collection = useCollection();
  const query = useQuery({
    queryKey: overviewKey(collection.id),
    queryFn: ({ signal }) => fetchOverview(collection.id, signal),
  });
  const created = new Date(collection.createdUtc).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <div data-color={collection.color || "forest"}>
      <header className="collection-heading">
        <span className="eyebrow">
          {collection.category || "Your collection"} / Overview
        </span>
        <h1>{collection.name}</h1>
        <p>
          {collection.description ||
            "Collected with care. Yours to make your own."}
        </p>
        <Link
          className="button"
          href={`/collections/${collection.id}/items/new`}
        >
          Add an item
        </Link>
      </header>
      <section className="identity-hero">
        <CollectionCover
          key={collection.coverImageUrl}
          url={collection.coverImageUrl}
          name={collection.name}
        />
        <div>
          <span className="eyebrow">A collection with a story</span>
          <h2>Every find belongs somewhere.</h2>
          <p>A home for the things you discover, keep, and come back to.</p>
          <span className="date-tag">Started {created}</span>
        </div>
      </section>
      {query.isPending ? (
        <p role="status" className="workspace-note">
          Gathering your collection…
        </p>
      ) : query.isError ? (
        <div role="alert" className="workspace-note">
          <h2>Your overview is out of reach.</h2>
          <p>We couldn't load the latest counts and items.</p>
          {query.error instanceof CollectionsError &&
          query.error.status === 401 ? (
            <a className="button" href="/auth/login?returnTo=%2Fcollections">
              Sign in again
            </a>
          ) : (
            <button className="button" onClick={() => void query.refetch()}>
              Try again
            </button>
          )}
        </div>
      ) : (
        <>
          <dl className="summary-cards" aria-label="Collection summary">
            <div>
              <dt>Items</dt>
              <dd>{query.data.summary.totalItems}</dd>
            </div>
            <div>
              <dt>Images & media</dt>
              <dd>{query.data.summary.totalMediaAssets}</dd>
            </div>
            <div>
              <dt>Tags in use</dt>
              <dd>{query.data.summary.tagsUsed}</dd>
            </div>
            <div>
              <dt>Places</dt>
              <dd>{query.data.summary.locationsUsed}</dd>
            </div>
          </dl>
          {query.data.items.length === 0 ? (
            <section className="workspace-note empty-overview">
              <span className="eyebrow">The beginning of something good</span>
              <h2>What will you keep first?</h2>
              <p>Start with one item and give it a story.</p>
              <Link
                className="button"
                href={`/collections/${collection.id}/items/new`}
              >
                Add your first item
              </Link>
            </section>
          ) : (
            <section className="recent-section">
              <span className="eyebrow">The latest finds</span>
              <h2>Recently added</h2>
              <ul className="recent-items">
                {query.data.items.map((item) => (
                  <li key={item.id}>
                    <span className="item-monogram" aria-hidden="true">
                      {item.name.slice(0, 1)}
                    </span>
                    <div>
                      <h3>
                        <Link
                          href={`/collections/${collection.id}/items/${item.id}`}
                        >
                          {item.name}
                        </Link>
                      </h3>
                      <p>
                        {item.description || "A new part of your collection."}
                      </p>
                      <time dateTime={item.createdUtc}>
                        {new Date(item.createdUtc).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
