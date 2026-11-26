"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchInsights, insightsKey } from "@/lib/insights";
import type { ShowcaseSettings } from "@/lib/showcase";
import { useCollection } from "./collection-context";
import { vocabulary } from "@/lib/customization";
import { ItemFailure } from "./item-shared";

export function ShowcaseReports({ settings }: { settings: ShowcaseSettings }) {
  const collection = useCollection();
  const words = vocabulary(collection);
  const query = useQuery({
    queryKey: [...insightsKey(collection.id), ""],
    queryFn: ({ signal }) => fetchInsights(collection.id, "", signal),
  });
  const data = query.data;
  const types = data
    ? [...data.itemsByType].sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name),
      )
    : [];
  return (
    <section className="showcase-reports" aria-label="Collection reports">
      <header>
        <span className="eyebrow">The collection in numbers</span>
        <h2>A story still growing.</h2>
      </header>
      {query.isPending ? (
        <p role="status">Loading collection reports…</p>
      ) : query.isError ? (
        <ItemFailure
          collectionId={collection.id}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        data && (
          <>
            {settings.showGrowth && (
              <section
                className="showcase-report"
                aria-label="Additions over twelve months"
              >
                <h3>New finds, month by month.</h3>
                <p>
                  {words.Many} still in your collection, grouped by when they
                  were added. Dates use UTC; deleted {words.many} are excluded.
                </p>
                {data.addedByMonth.every((month) => month.count === 0) && (
                  <p>No additions in these twelve months.</p>
                )}
                <ol className="growth-chart">
                  {data.addedByMonth.map((month) => (
                    <li key={month.fromUtc}>
                      <Link
                        href={`/collections/${collection.id}/browse?${new URLSearchParams({ createdAfter: month.fromUtc, createdBeforeExclusive: month.toUtc })}`}
                        aria-label={`${new Date(month.fromUtc).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}: ${month.count} ${words.many}`}
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
            )}
            {settings.showTypes && (
              <section
                className="showcase-report"
                aria-label="Collection by item type"
              >
                <h3>The shape of this collection.</h3>
                <p>{words.Many} grouped by item type.</p>
                {types.length ? (
                  <ol className="showcase-type-list">
                    {types.slice(0, 6).map((row) => (
                      <li key={row.itemTypeId || "none"}>
                        <Link
                          href={`/collections/${collection.id}/browse?${new URLSearchParams(row.itemTypeId ? { itemTypeId: row.itemTypeId } : { hasNoItemType: "true" })}`}
                        >
                          <span>{row.name}</span>
                          <strong>{row.count}</strong>
                          <span aria-hidden="true">↗</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>Add your first {words.one} to begin this report.</p>
                )}
                {types.length > 6 && (
                  <p>
                    Showing the six largest groups.{" "}
                    <Link href={`/collections/${collection.id}/insights`}>
                      See all {types.length} groups in Insights
                    </Link>
                    .
                  </p>
                )}
              </section>
            )}
          </>
        )
      )}
    </section>
  );
}
