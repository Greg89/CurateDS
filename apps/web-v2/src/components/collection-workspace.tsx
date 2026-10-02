"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { collectionQueryKey, fetchCollections } from "@/lib/collections";
import { CollectionProvider, useCollection } from "./collection-context";
import {
  CollectionFailure,
  CollectionLoading,
  CollectionMissing,
} from "./collection-states";

export function CollectionWorkspace({ children }: { children: ReactNode }) {
  const { collectionId } = useParams<{ collectionId: string }>();
  const router = useRouter();
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
  const collection = query.data.find(
    (entry) => entry.id.toLowerCase() === collectionId.toLowerCase(),
  );
  if (!collection) return <CollectionMissing />;
  return (
    <CollectionProvider collection={collection}>
      <div className="workspace">
        <aside className="collection-sidebar">
          <Link className="back-link" href="/collections">
            ← All collections
          </Link>
          <label className="eyebrow" htmlFor="collection-switcher">
            Your collection
          </label>
          <select
            id="collection-switcher"
            value={collection.id}
            onChange={(event) =>
              router.push(`/collections/${event.target.value}`)
            }
          >
            {query.data.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <nav aria-label="Collection">
            <Link
              className="nav-link active"
              aria-current="page"
              href={`/collections/${collection.id}`}
            >
              Overview <span aria-hidden="true">↗</span>
            </Link>
            {["Browse", "Insights", "Showcase", "Settings"].map((label) => (
              <span className="nav-link forthcoming" key={label}>
                {label}
                <small>Soon</small>
              </span>
            ))}
          </nav>
          <p className="sidebar-note">
            Collected by you.
            <br />
            Made to be enjoyed.
          </p>
        </aside>
        <div className="collection-content" key={collection.id}>
          {children}
        </div>
      </div>
    </CollectionProvider>
  );
}

export function CollectionOverview() {
  const collection = useCollection();
  const created = new Date(collection.createdUtc).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <>
      <header className="collection-heading">
        <span className="eyebrow">Your collection / Overview</span>
        <h1>{collection.name}</h1>
        <p>Collected with care. Yours to make your own.</p>
      </header>
      <section className="overview-hero">
        <div>
          <span className="eyebrow">A collection with a story</span>
          <h2>
            Every find
            <br />
            belongs somewhere.
          </h2>
          <p>
            This is the home for {collection.name}. A place to keep its stories,
            rediscover old favorites, and enjoy what you've collected.
          </p>
          <span className="date-tag">Started {created}</span>
        </div>
        <div className="still-life" aria-hidden="true">
          <div className="object object-book" />
          <div className="object object-disc" />
          <div className="object object-card" />
        </div>
      </section>
      <section className="workspace-note">
        <span className="eyebrow">A new home, taking shape</span>
        <h2>More ways to enjoy your collection.</h2>
        <p>
          Browsing, insights, and collection customization are on their way.
          Your existing collection stays right where you left it.
        </p>
      </section>
    </>
  );
}
