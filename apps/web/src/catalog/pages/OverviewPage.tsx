import { AttributeDefinition, Collection, ItemDetail, ItemSummary, Location, Tag } from "../../api";
import { AttributeDefinitionList } from "../components/AttributeDefinitionList";
import { ItemDetailCard } from "../components/ItemDetailCard";
import { MetricCard } from "../components/MetricCard";
import { OrganizationSummary } from "../components/OrganizationSummary";

export function OverviewPage({
  attributeDefinitions,
  items,
  itemDetail,
  locations,
  savedViewsSummary,
  selectedCollection,
  tags,
  onEditItem
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  items: ItemSummary[];
  itemDetail: ItemDetail | null;
  locations: Location[];
  savedViewsSummary: string;
  selectedCollection: Collection;
  tags: Tag[];
  onEditItem: () => void;
}>) {
  return (
    <section className="content-grid">
      <section className="panel">
        <div className="panel-header">
          <h3>{selectedCollection.name}</h3>
          <p>Overview of the current collection shape, organization, and activity.</p>
        </div>

        <div className="metric-grid">
          <MetricCard label="Items" value={items.length.toString()} />
          <MetricCard
            label="Attributes"
            value={attributeDefinitions.length.toString()}
          />
          <MetricCard label="Tags" value={tags.length.toString()} />
          <MetricCard label="Locations" value={locations.length.toString()} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Saved Views</h3>
          <p>Quick access combinations for item browsing in this collection.</p>
        </div>

        <div className="empty-state compact">
          <p>{savedViewsSummary}</p>
          <p>Saved views live in the browser for now so you can refine workflows safely.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Collection Shape</h3>
          <p>Custom fields that make this collection hobby-specific without changing the core model.</p>
        </div>

        <AttributeDefinitionList
          attributeDefinitions={attributeDefinitions}
          selectedCollectionName={selectedCollection.name}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Organization Snapshot</h3>
          <p>Reusable labels and storage zones available to items in this collection.</p>
        </div>

        <OrganizationSummary items={items} locations={locations} tags={tags} />
      </section>

      <section className="panel panel-wide">
        <div className="panel-header">
          <h3>Selected Item</h3>
          <p>Keep the current item detail close at hand while navigating the collection.</p>
        </div>

        <ItemDetailCard
          isEditing={false}
          item={itemDetail}
          onEdit={onEditItem}
          selectedCollectionName={selectedCollection.name}
        />
      </section>
    </section>
  );
}
