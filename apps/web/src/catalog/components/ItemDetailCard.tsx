import { useQuery } from "@tanstack/react-query";
import { ItemDetail, listItemEvents } from "../../api";

const EVENT_LABELS: Record<string, string> = {
  Created: "Item created",
  Updated: "Item updated",
  TagsChanged: "Tags changed",
  LocationChanged: "Location changed",
  AttributesChanged: "Attributes changed",
  Deleted: "Item deleted"
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function ItemDetailCard({
  item,
  isEditing,
  onEdit,
  onDelete,
  selectedCollectionName
}: Readonly<{
  item: ItemDetail | null;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  selectedCollectionName: string | null;
}>) {
  const eventsQuery = useQuery({
    queryKey: ["item-events", item?.collectionId, item?.id],
    queryFn: () => listItemEvents(item!.collectionId, item!.id),
    enabled: !!item
  });
  if (!selectedCollectionName) {
    return null;
  }

  if (!item) {
    return (
      <div className="empty-state compact">
        <p>No item selected.</p>
        <p>Choose an item to review its saved detail view.</p>
      </div>
    );
  }

  return (
    <section className="item-detail-card">
      <div className="item-card-header">
        <div>
          <p className="eyebrow subtle">Item Detail</p>
          <h3>{item.name}</h3>
        </div>
        <div className="detail-actions">
          <span className="attribute-pill">Qty {item.quantity}</span>
          <button className="secondary-button" onClick={onEdit} type="button">
            {isEditing ? "Editing" : "Edit Item"}
          </button>
          <button className="danger-button" onClick={onDelete} type="button">
            Delete
          </button>
        </div>
      </div>

      <p className="item-detail-copy">
        {item.description ?? "No description has been saved for this item yet."}
      </p>

      <div className="detail-meta-grid">
        <p>{item.locationName ? `Location: ${item.locationName}` : "Location: None"}</p>
        <p>{item.tags.length > 0 ? `Tags: ${item.tags.map((tag) => tag.name).join(", ")}` : "Tags: None"}</p>
        <p>
          Created{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(item.createdUtc))}
        </p>
        <p>
          Updated{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(item.updatedUtc))}
        </p>
      </div>

      {item.attributeValues.length === 0 ? (
        <div className="empty-state compact">
          <p>No custom values were saved.</p>
          <p>This item only uses the shared core fields so far.</p>
        </div>
      ) : (
        <ul className="detail-value-list">
          {item.attributeValues.map((attributeValue) => (
            <li className="detail-value-card" key={attributeValue.attributeDefinitionId}>
              <div className="attribute-card-header">
                <h3>{attributeValue.attributeName}</h3>
                <span className="attribute-pill">{attributeValue.dataType}</span>
              </div>
              <p className="attribute-meta">
                Key: <code>{attributeValue.attributeKey}</code>
              </p>
              <p className="item-value">{attributeValue.value}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="item-event-timeline">
        <h4 className="timeline-heading">History</h4>
        {eventsQuery.isLoading && <p className="message">Loading history...</p>}
        {eventsQuery.data && eventsQuery.data.length === 0 && (
          <p className="timeline-empty">No history recorded yet.</p>
        )}
        {eventsQuery.data && eventsQuery.data.length > 0 && (
          <ol className="timeline-list">
            {eventsQuery.data.map((event) => (
              <li className="timeline-event" key={event.id}>
                <span className="timeline-label">
                  {EVENT_LABELS[event.eventType] ?? event.eventType}
                </span>
                <span className="timeline-meta">
                  {dateFormat.format(new Date(event.occurredUtc))}
                </span>
                {event.notes && <p className="timeline-notes">{event.notes}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
