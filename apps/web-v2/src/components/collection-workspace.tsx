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
  const settings = section === "settings";
  const insights = section === "insights";
  const showcase = section === "showcase";
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
      <div className={showcase ? "workspace showcase-workspace" : "workspace"}>
        <aside
          className={
            showcase
              ? "collection-sidebar showcase-toolbar"
              : "collection-sidebar"
          }
          aria-label={showcase ? "Showcase controls" : undefined}
        >
          <Link
            className="back-link"
            href={showcase ? `/collections/${collection.id}` : "/collections"}
          >
            {showcase ? "← Back to collection" : "← All collections"}
          </Link>
          <label className="eyebrow" htmlFor="collection-switcher">
            Your collection
          </label>
          <select
            id="collection-switcher"
            value={collection.id}
            onChange={(event) =>
              router.push(
                `/collections/${event.target.value}${showcase ? "/showcase" : settings ? "/settings" : insights ? "/insights" : browsing ? "/browse" : ""}`,
              )
            }
          >
            {query.data.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          {showcase ? (
            <Link
              className="text-button"
              href={`/collections/${collection.id}/settings#showcase`}
            >
              Customize presentation
            </Link>
          ) : (
            <>
              <Link className="back-link" href="/collections/new">
                ＋ New collection
              </Link>
              <nav aria-label="Collection">
                <Link
                  className={`nav-link ${!browsing && !insights && !settings ? "active" : ""}`}
                  aria-current={
                    !browsing && !insights && !settings ? "page" : undefined
                  }
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
                <Link
                  className={`nav-link ${settings ? "active" : ""}`}
                  aria-current={settings ? "page" : undefined}
                  href={`/collections/${collection.id}/settings`}
                >
                  Settings <span aria-hidden="true">↗</span>
                </Link>
                <Link
                  className="nav-link"
                  href={`/collections/${collection.id}/showcase`}
                >
                  Showcase <span aria-hidden="true">↗</span>
                </Link>
              </nav>
              <p className="sidebar-note">
                Collected by you.
                <br />
                Made to be enjoyed.
              </p>
            </>
          )}
        </aside>
        <div className="collection-content" key={collection.id}>
          {children}
        </div>
      </div>
    </CollectionProvider>
  );
}

export { CollectionOverview } from "./collection-overview";
