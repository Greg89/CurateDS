"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCollection } from "./collection-context";
import { ItemFailure } from "./item-shared";
import { fetchOptions, optionsKey, readJson } from "@/lib/items";
import {
  activityKey,
  activitySchema,
  fetchInsights,
  insightsKey,
} from "@/lib/insights";
import { SavedViews } from "./saved-views";

function Breakdown({
  title,
  note,
  rows,
}: {
  title: string;
  note?: string;
  rows: { key: string; name: string; count: number; href: string }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="insight-panel">
      <h2>{title}</h2>
      {note && <p>{note}</p>}
      {rows.length ? (
        <ul className="insight-breakdown">
          {rows.map((row) => (
            <li key={row.key}>
              <Link href={row.href}>
                <span>{row.name}</span>
                <strong>{row.count}</strong>
                <i
                  aria-hidden="true"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No items to group yet.</p>
      )}
    </section>
  );
}
export function CollectionInsights() {
  const collection = useCollection();
  const search = useSearchParams(),
    router = useRouter();
  const attribute = search.get("attributeDefinitionId") || "";
  const page = Number(search.get("page") || 1);
  const validPage = Number.isInteger(page) && page > 0 && page <= 100000;
  const base = `/collections/${collection.id}`;
  const browse = (filters: Record<string, string> = {}) =>
    `${base}/browse?${new URLSearchParams(filters)}`;
  const options = useQuery({
    queryKey: optionsKey(collection.id),
    queryFn: ({ signal }) => fetchOptions(collection.id, signal),
  });
  const query = useQuery({
    queryKey: [...insightsKey(collection.id), attribute],
    queryFn: ({ signal }) => fetchInsights(collection.id, attribute, signal),
  });
  const activity = useQuery({
    queryKey: [...activityKey(collection.id), page],
    enabled: validPage,
    queryFn: ({ signal }) =>
      readJson(
        `/api/collections/${collection.id}/activity?page=${page}`,
        activitySchema,
        signal,
      ),
  });
  const data = query.data;
  const currentMonth = data?.addedByMonth.at(-1);
  function activityHref(next: number) {
    const params = new URLSearchParams(search.toString());
    params.set("page", String(next));
    return `${base}/insights?${params}`;
  }
  return (
    <section data-color={collection.color || "forest"}>
      <header className="collection-heading">
        <span className="eyebrow">
          {collection.category || "Your collection"} / Insights
        </span>
        <h1>The shape of {collection.name}.</h1>
        <p>
          See what is growing, what belongs together, and what deserves another
          look.
        </p>
        <Link className="button" href={browse()}>
          Explore the collection
        </Link>
      </header>
      {query.isPending ? (
        <p role="status">Gathering your insights…</p>
      ) : query.isError ? (
        <>
          <ItemFailure
            error={query.error}
            retry={() => void query.refetch()}
            collectionId={collection.id}
          />
          <Link className="text-button" href={`${base}/insights`}>
            Reset insights
          </Link>
        </>
      ) : (
        data && (
          <>
            {Number(data.summary.totalItems) === 0 && (
              <section className="workspace-note">
                <h2>Every collection starts with one find.</h2>
                <p>Your patterns will take shape as you add items.</p>
                <Link className="button" href={`${base}/items/new`}>
                  Add your first item
                </Link>
              </section>
            )}
            <div className="insight-cards">
              {[
                {
                  label: "Items kept",
                  count: data.summary.totalItems,
                  href: browse(),
                },
                {
                  label: "Added this month",
                  count: currentMonth?.count || 0,
                  href: browse({
                    createdAfter: currentMonth!.fromUtc,
                    createdBeforeExclusive: currentMonth!.toUtc,
                  }),
                },
                {
                  label: "Without tags",
                  count: data.summary.itemsWithNoTags,
                  href: browse({ hasNoTags: "true" }),
                },
                {
                  label: "Without a location",
                  count: data.summary.itemsWithNoLocation,
                  href: browse({ hasNoLocation: "true" }),
                },
              ].map((card) => (
                <Link key={card.label} href={card.href}>
                  <strong>{card.count}</strong>
                  <span>{card.label}</span>
                  <small>View items ↗</small>
                </Link>
              ))}
            </div>
            <section className="insight-panel growth-panel">
              <span className="eyebrow">The last twelve months</span>
              <h2>New finds, month by month.</h2>
              <p>
                Items still in your collection, grouped by when they were added.
                Dates use UTC; deleted items are excluded.
              </p>
              <ol className="growth-chart">
                {data.addedByMonth.map((month) => (
                  <li key={month.fromUtc}>
                    <Link
                      href={browse({
                        createdAfter: month.fromUtc,
                        createdBeforeExclusive: month.toUtc,
                      })}
                      aria-label={`${new Date(month.fromUtc).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}: ${month.count} items`}
                    >
                      <strong>{month.count}</strong>
                      <span className="growth-track">
                        <i
                          style={{
                            height: `${(month.count / Math.max(1, ...data.addedByMonth.map((m) => m.count))) * 100}%`,
                          }}
                        />
                      </span>
                      <span>
                        {new Date(month.fromUtc).toLocaleDateString("en-US", {
                          month: "short",
                          timeZone: "UTC",
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
            <div className="insight-columns">
              <Breakdown
                title="Where things live"
                rows={data.reports.itemsByLocation.map((row) => ({
                  key: row.locationId || "none",
                  name: row.locationName,
                  count: row.count,
                  href: browse(
                    row.locationId
                      ? { locationId: row.locationId }
                      : { hasNoLocation: "true" },
                  ),
                }))}
              />
              <Breakdown
                title="Threads in your collection"
                note="An item can carry more than one tag, so these counts can overlap."
                rows={data.reports.itemsByTag.map((row) => ({
                  key: row.tagId,
                  name: row.tagName,
                  count: row.count,
                  href: browse({ tagIds: row.tagId }),
                }))}
              />
              <Breakdown
                title="Kinds of things"
                note="Grouped by item type within this collection."
                rows={data.itemsByType.map((row) => ({
                  key: row.itemTypeId || "none",
                  name: row.name,
                  count: row.count,
                  href: browse(
                    row.itemTypeId
                      ? { itemTypeId: row.itemTypeId }
                      : { hasNoItemType: "true" },
                  ),
                }))}
              />
              <section className="insight-panel">
                <h2>Details that tell a story</h2>
                <label className="insight-select">
                  Explore a custom field
                  <select
                    value={attribute}
                    disabled={options.isPending}
                    onChange={(event) => {
                      const params = new URLSearchParams();
                      if (event.target.value)
                        params.set("attributeDefinitionId", event.target.value);
                      router.push(`${base}/insights?${params}`, {
                        scroll: false,
                      });
                    }}
                  >
                    <option value="">Choose a field</option>
                    {options.data?.definitions
                      .filter((d) => d.isFilterable)
                      .map((d) => (
                        <option value={d.id} key={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </label>
                {options.isError && (
                  <p role="alert">
                    Fields couldn't be loaded.{" "}
                    <button onClick={() => void options.refetch()}>
                      Retry fields
                    </button>
                  </p>
                )}
                {options.data &&
                  !options.data.definitions.some((d) => d.isFilterable) && (
                    <p>No filterable custom fields yet.</p>
                  )}
                {data.attribute && (
                  <>
                    <Breakdown
                      title={data.attribute.name}
                      note={`${data.attribute.totalWithValue} items have a value. Showing up to 20 most common values; each link matches that exact value.`}
                      rows={data.attribute.values.map((row) => ({
                        key: row.value,
                        name: row.value,
                        count: row.count,
                        href: browse({
                          exactAttributeKey: data.attribute!.key,
                          exactAttributeValue: row.value,
                        }),
                      }))}
                    />
                  </>
                )}
              </section>
            </div>
          </>
        )
      )}
      <section className="insight-panel">
        <h2>Recently in your collection</h2>
        <p>
          A history of changes. Deleted items may no longer be available to
          open.
        </p>
        {!validPage ? (
          <p role="alert">
            Invalid activity page.{" "}
            <Link href={activityHref(1)}>Return to page 1</Link>
          </p>
        ) : activity.isError ? (
          <ItemFailure
            error={activity.error}
            retry={() => void activity.refetch()}
            collectionId={collection.id}
          />
        ) : activity.isPending ? (
          <p role="status">Loading activity…</p>
        ) : (
          <>
            {activity.data.events.length ? (
              <ol className="activity-list">
                {activity.data.events.map((event) => (
                  <li key={event.eventId}>
                    <div>
                      <Link href={`${base}/items/${event.itemId}`}>
                        {event.itemName}
                      </Link>
                      <span>
                        {event.eventType.replace(/([a-z])([A-Z])/g, "$1 $2")}
                      </span>
                    </div>
                    <time dateTime={event.occurredUtc}>
                      {new Date(event.occurredUtc).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No activity on this page yet.</p>
            )}
            <nav className="pagination" aria-label="Activity pages">
              {page > 1 && (
                <Link href={activityHref(page - 1)}>← Newer activity</Link>
              )}
              <span>
                Page {page} of {Math.max(1, activity.data.totalPages)}
              </span>
              {page < activity.data.totalPages && (
                <Link href={activityHref(page + 1)}>Older activity →</Link>
              )}
            </nav>
          </>
        )}
      </section>
      <SavedViews collectionId={collection.id} />
    </section>
  );
}
