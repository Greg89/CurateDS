import { Link } from "react-router-dom";
import { AttributeDefinition, Collection, ItemSummary, Location, Tag } from "../../api";
import { MetricCard } from "../components/MetricCard";

export function OverviewPage({
  attributeDefinitions,
  items,
  locations,
  selectedCollection,
  tags
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  items: ItemSummary[];
  locations: Location[];
  selectedCollection: Collection;
  tags: Tag[];
}>) {
  return (
    <section className="overview-shell">
      <section className="panel">
        <div className="panel-header">
          <h3>{selectedCollection.name}</h3>
          <p>A snapshot of what's in this collection right now.</p>
        </div>

        <div className="metric-grid">
          <MetricCard label="Items" value={items.length.toString()} />
          <MetricCard label="Attributes" value={attributeDefinitions.length.toString()} />
          <MetricCard label="Tags" value={tags.length.toString()} />
          <MetricCard label="Locations" value={locations.length.toString()} />
        </div>
      </section>

      <div className="overview-actions">
        <Link
          className="overview-action-card panel"
          to={`/collections/${selectedCollection.id}/items`}
        >
          <h3>Browse Items →</h3>
          <p>Search, filter, and manage the entries in this collection.</p>
        </Link>

        <Link
          className="overview-action-card panel"
          to={`/collections/${selectedCollection.id}/settings`}
        >
          <h3>Manage Settings →</h3>
          <p>Configure attributes, tags, and locations for this collection.</p>
        </Link>
      </div>
    </section>
  );
}
