import { useQuery } from "@tanstack/react-query";
import { listItemEvents } from "../../api";

const EVENT_LABELS: Record<string, string> = {
  Created: "Item created",
  Updated: "Item updated",
  TagsChanged: "Tags changed",
  LocationChanged: "Location changed",
  AttributesChanged: "Attributes changed",
  Deleted: "Item deleted"
};

const historyDateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function ItemHistorySection({
  collectionId,
  itemId
}: Readonly<{
  collectionId: string;
  itemId: string;
}>) {
  const eventsQuery = useQuery({
    queryKey: ["item-events", collectionId, itemId],
    queryFn: () => listItemEvents(collectionId, itemId)
  });

  return (
    <div className="item-event-timeline">
      <h4 className="timeline-heading">History</h4>
      {eventsQuery.isLoading ? <p className="message">Loading history...</p> : null}
      {eventsQuery.data && eventsQuery.data.length === 0 ? (
        <p className="timeline-empty">No history recorded yet.</p>
      ) : null}
      {eventsQuery.data && eventsQuery.data.length > 0 ? (
        <ol className="timeline-list">
          {eventsQuery.data.map((event) => (
            <li className="timeline-event" key={event.id}>
              <span className="timeline-label">
                {EVENT_LABELS[event.eventType] ?? event.eventType}
              </span>
              <span className="timeline-meta">
                {historyDateFormat.format(new Date(event.occurredUtc))}
              </span>
              {event.notes ? <p className="timeline-notes">{event.notes}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
