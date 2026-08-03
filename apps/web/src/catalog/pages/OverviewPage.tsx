import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Collection, getCollectionSummary } from "../../api";
import { MetricCard } from "../components/MetricCard";

export function OverviewPage({
  selectedCollection
}: Readonly<{
  selectedCollection: Collection;
}>) {
  const summaryQuery = useQuery({
    queryKey: ["collection-summary", selectedCollection.id],
    queryFn: () => getCollectionSummary(selectedCollection.id)
  });

  const summary = summaryQuery.data;
  const isEmpty = summary !== undefined && summary.totalItems === 0;

  return (
    <section className="overview-shell">
      <section className="panel">
        <div className="panel-header">
          <h3>{selectedCollection.name}</h3>
          <p>A snapshot of what's in this collection right now.</p>
        </div>

        {isEmpty ? (
          <div className="empty-state">
            <p><strong>This collection is empty - here's how to get started:</strong></p>
            <ol style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", display: "grid", gap: "0.35rem" }}>
              <li>
                <Link to={`/collections/${selectedCollection.id}/settings`}>Configure attributes</Link>
                {" "}- define the fields that describe items in this collection.
              </li>
              <li>
                <Link to={`/collections/${selectedCollection.id}/settings`}>Add tags and locations</Link>
                {" "}- set up organisation options (optional).
              </li>
              <li>
                <Link to={`/collections/${selectedCollection.id}/items`}>Add your first item</Link>
                {" "}- start cataloguing.
              </li>
            </ol>
          </div>
        ) : (
          <div className="metric-grid">
            <MetricCard label="Items" value={summary?.totalItems.toString() ?? "-"} />
            <MetricCard label="Attributes" value={summary?.totalAttributeDefinitions.toString() ?? "-"} />
            <MetricCard label="Tags in use" value={summary?.tagsUsed.toString() ?? "-"} />
            <MetricCard label="Locations in use" value={summary?.locationsUsed.toString() ?? "-"} />
            <MetricCard label="No location" value={summary?.itemsWithNoLocation.toString() ?? "-"} />
            <MetricCard label="No tags" value={summary?.itemsWithNoTags.toString() ?? "-"} />
            <MetricCard label="Media assets" value={summary?.totalMediaAssets.toString() ?? "-"} />
          </div>
        )}
      </section>

      <div className="overview-actions">
        <Link
          className="overview-action-card panel"
          to={`/collections/${selectedCollection.id}/items`}
        >
          <h3>Browse Items {"->"}</h3>
          <p>Search, filter, and manage the entries in this collection.</p>
        </Link>

        <Link
          className="overview-action-card panel"
          to={`/collections/${selectedCollection.id}/settings`}
        >
          <h3>Manage Settings {"->"}</h3>
          <p>Configure attributes, tags, and locations for this collection.</p>
        </Link>
      </div>
    </section>
  );
}
