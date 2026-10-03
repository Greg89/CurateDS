"use client";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { collectionQueryKey, fetchCollections } from "@/lib/collections";
import { CollectionProvider } from "./collection-context";
import {
  CollectionFailure,
  CollectionLoading,
  CollectionMissing,
} from "./collection-states";

export function CollectionWorkspace({ children }: { children: ReactNode }) {
  const { collectionId } = useParams<{ collectionId: string }>();
  const router = useRouter();
  const section = usePathname().split("/")[3];
  const insights = section === "insights";
  const browsing = section === "browse" || section === "items";
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
              router.push(
                `/collections/${event.target.value}${insights ? "/insights" : browsing ? "/browse" : ""}`,
              )
            }
          >
            {query.data.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <Link className="back-link" href="/collections/new">
            ＋ New collection
          </Link>
          <nav aria-label="Collection">
            <Link
              className={`nav-link ${!browsing && !insights ? "active" : ""}`}
              aria-current={!browsing && !insights ? "page" : undefined}
              href={`/collections/${collection.id}`}
            >
              Overview <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className={`nav-link ${browsing ? "active" : ""}`}
              aria-current={browsing ? "page" : undefined}
              href={`/collections/${collection.id}/browse`}
            >
              Browse <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className={`nav-link ${insights ? "active" : ""}`}
              aria-current={insights ? "page" : undefined}
              href={`/collections/${collection.id}/insights`}
            >
              Insights <span aria-hidden="true">↗</span>
            </Link>
            {["Showcase", "Settings"].map((label) => (
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

export { CollectionOverview } from "./collection-overview";
