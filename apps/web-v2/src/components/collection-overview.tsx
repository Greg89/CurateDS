"use client";
import { vocabulary } from "@/lib/customization";
import { OverviewItems } from "./overview-items";

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
  const words = vocabulary(collection);
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
          {words.add}
        </Link>
        <div className="overview-links">
          <Link href={`/collections/${collection.id}/browse`}>
            Browse all {words.many}
          </Link>
          <Link href={`/collections/${collection.id}/settings#overview`}>
            Customize overview
          </Link>
        </div>
      </header>
      {query.data?.presentation.showCover && (
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
      )}
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
          {query.data.presentation.showSummary && (
            <dl className="summary-cards" aria-label="Collection summary">
              <div>
                <dt>{words.Many}</dt>
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
          )}
          {query.data.summary.totalItems === 0 ? (
            <section className="workspace-note empty-overview">
              <h2>What will you keep first?</h2>
              <p>Start with one {words.one} and give it a story.</p>
              <Link
                className="button"
                href={`/collections/${collection.id}/items/new`}
              >
                Add your first {words.one}
              </Link>
            </section>
          ) : (
            <>
              {query.data.presentation.showPinnedItems &&
                (query.data.presentation.pinnedItems.length ? (
                  <OverviewItems
                    title={`Pinned ${words.many}`}
                    items={query.data.presentation.pinnedItems}
                    collectionId={collection.id}
                  />
                ) : (
                  <section className="workspace-note">
                    <h2>Your favourites, up front.</h2>
                    <p>
                      Choose up to six {words.many} to give them a place on your
                      overview.
                    </p>
                    <Link
                      href={`/collections/${collection.id}/settings#overview`}
                    >
                      Choose pinned {words.many}
                    </Link>
                  </section>
                ))}
              {query.data.presentation.showRecentItems && (
                <OverviewItems
                  title="Recently added"
                  items={query.data.items}
                  collectionId={collection.id}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
