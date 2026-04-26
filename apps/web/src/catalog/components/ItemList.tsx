import { ItemSummary } from "../../api";

export function ItemList({
  items,
  selectedCollectionName,
  selectedItemId,
  onSelect
}: Readonly<{
  items: ItemSummary[];
  selectedCollectionName: string | null;
  selectedItemId: string;
  onSelect: (itemId: string) => void;
}>) {
  if (!selectedCollectionName) {
    return (
      <div className="empty-state compact">
        <p>No collection selected.</p>
        <p>Pick a collection to see its item list.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state compact">
        <p>No items yet for {selectedCollectionName}.</p>
        <p>Create the first entry to validate the end-to-end slice.</p>
      </div>
    );
  }

  return (
    <ul className="item-list">
      {items.map((item) => (
        <li
          className={`item-card${item.id === selectedItemId ? " selected" : ""}`}
          key={item.id}
        >
          <button className="item-select" onClick={() => onSelect(item.id)} type="button">
            <div className="item-card-header">
              <h3>{item.name}</h3>
              <span className="attribute-pill">Qty {item.quantity}</span>
            </div>
            <p>{item.description ?? "No description yet."}</p>
            <p>
              {item.locationName ? `Location: ${item.locationName}` : "No location assigned"}
            </p>
            <p>{item.tags.length > 0 ? `Tags: ${item.tags.join(", ")}` : "No tags assigned"}</p>
            <p>
              {item.attributeValueCount} custom value
              {item.attributeValueCount === 1 ? "" : "s"}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
