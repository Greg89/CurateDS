"use client";
import Link from "next/link";
import { fetchShowcaseSettings, showcaseKey } from "@/lib/showcase";
import { ShowcaseReports } from "./showcase-reports";
import { useQuery } from "@tanstack/react-query";
import { useCollection } from "./collection-context";
import { CollectionCover } from "./collection-cover";
import { ItemImage } from "./item-shared";
import {
  CollectionsError,
  fetchOverview,
  overviewKey,
  type RecentItem,
} from "@/lib/collections";
import { vocabulary } from "@/lib/customization";

function ShowcaseGallery({
  title,
  note,
  items,
  featured = false,
}: {
  title: string;
  note: string;
  items: RecentItem[];
  featured?: boolean;
}) {
  return (
    <section
      className={`showcase-gallery${featured ? " showcase-highlights" : ""}`}
      aria-label={title}
    >
      <header>
        <span className="eyebrow">{note}</span>
        <h2>{title}</h2>
      </header>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <Link href={`/collections/${item.collectionId}/items/${item.id}`}>
              <ItemImage
                key={item.primaryImageUrl}
                url={item.primaryImageUrl}
                name={item.name}
              />
              <div className="showcase-caption">
                <span className="showcase-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description || "A part of the story."}</p>
                </div>
                <span className="showcase-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CollectionShowcase() {
  const collection = useCollection();
  const words = vocabulary(collection);
  // Share the existing collection-scoped cache and write invalidation rules.
  const query = useQuery({
    queryKey: overviewKey(collection.id),
    queryFn: ({ signal }) => fetchOverview(collection.id, signal),
  });
  const settings = useQuery({
    queryKey: showcaseKey(collection.id),
    queryFn: ({ signal }) => fetchShowcaseSettings(collection.id, signal),
  });
  const error = query.error || settings.error;
  const data = query.data;
  const pins = data?.presentation.showPinnedItems
    ? data.presentation.pinnedItems
    : [];
  const pinnedIds = new Set(pins.map((item) => item.id));
  const recent = data?.presentation.showRecentItems
    ? data.items.filter((item) => !pinnedIds.has(item.id))
    : [];
  const started = new Date(collection.createdUtc).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <div
      className="showcase"
      data-color={collection.color || "forest"}
      data-layout={settings.data?.layout}
    >
      <div
        className="showcase-preview-note"
        role="note"
        aria-label="Private preview"
      >
        <strong>Private preview</strong>
        <span>
          Only you can open this view. Your saved settings shape this
          presentation.
        </span>
      </div>
      {query.isPending || settings.isPending ? (
        <section className="workspace-note" role="status">
          <h1>{collection.name}</h1>
          <p>Preparing your showcase…</p>
        </section>
      ) : error ? (
        <section className="workspace-note" role="alert">
          <h1>{collection.name}</h1>
          <h2>Your showcase is out of reach.</h2>
          <p>We couldn't load this collection's presentation.</p>
          {error instanceof CollectionsError && error.status === 401 ? (
            <a className="button" href="/auth/login?returnTo=%2Fcollections">
              Sign in again
            </a>
          ) : error instanceof CollectionsError &&
            [403, 404].includes(error.status) ? (
            <Link className="button" href="/collections">
              Back to collections
            </Link>
          ) : (
            <button
              className="button"
              onClick={() => {
                void query.refetch();
                void settings.refetch();
              }}
            >
              Try again
            </button>
          )}
        </section>
      ) : (
        data && (
          <article aria-label={`${collection.name} showcase`}>
            <header
              className={`showcase-intro${data.presentation.showCover ? " with-cover" : ""}`}
            >
              <div className="showcase-story">
                <span className="eyebrow">
                  {collection.category || "A personal collection"}
                </span>
                <h1>{collection.name}</h1>
                <p className="showcase-description">
                  {collection.description ||
                    "The things we keep tell a story. This is mine."}
                </p>
                <span className="showcase-since">
                  Collected with care · Since {started}
                </span>
              </div>
              {data.presentation.showCover && (
                <CollectionCover
                  key={collection.coverImageUrl}
                  url={collection.coverImageUrl}
                  name={collection.name}
                />
              )}
            </header>
            {data.presentation.showSummary && (
              <dl
                className="showcase-summary"
                aria-label="Collection at a glance"
              >
                <div>
                  <dt>{words.Many}</dt>
                  <dd>{data.summary.totalItems}</dd>
                </div>
                <div>
                  <dt>Images & media</dt>
                  <dd>{data.summary.totalMediaAssets}</dd>
                </div>
                <div>
                  <dt>Tags in use</dt>
                  <dd>{data.summary.tagsUsed}</dd>
                </div>
              </dl>
            )}
            {pins.length > 0 && (
              <ShowcaseGallery
                title="Selected with care."
                note={`Highlights / ${words.many}`}
                items={pins}
                featured
              />
            )}
            {recent.length > 0 && (
              <ShowcaseGallery
                title="The latest finds."
                note="Recently welcomed"
                items={recent}
              />
            )}
            {data.summary.totalItems === 0 ? (
              <section className="showcase-empty">
                <span className="eyebrow">The beginning of a story</span>
                <h2>A collection taking shape.</h2>
                <p>Every collection starts with one find.</p>
                <Link
                  className="button"
                  href={`/collections/${collection.id}/items/new`}
                >
                  Add your first {words.one}
                </Link>
              </section>
            ) : (
              pins.length === 0 &&
              recent.length === 0 && (
                <aside className="showcase-empty">
                  <h2>A quiet introduction.</h2>
                  <p>
                    Choose pinned {words.many} or show recent additions in
                    Settings to bring more of your collection into view.
                  </p>
                  <Link
                    className="text-button"
                    href={`/collections/${collection.id}/settings#overview`}
                  >
                    Choose what appears
                  </Link>
                </aside>
              )
            )}
            {settings.data &&
              (settings.data.showGrowth || settings.data.showTypes) && (
                <ShowcaseReports settings={settings.data} />
              )}
            <footer className="showcase-footer">
              <p>Collected with care. Kept for the story.</p>
              <Link href={`/collections/${collection.id}/browse`}>
                Explore all {words.many} <span aria-hidden="true">↗</span>
              </Link>
            </footer>
          </article>
        )
      )}
    </div>
  );
}
