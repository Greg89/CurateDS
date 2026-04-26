import { ItemSummary } from "../../api";

export function ItemList({
  items,
  selectedCollectionName,
  selectedItemId,
  viewMode,
  onSelect
}: Readonly<{
  items: ItemSummary[];
  selectedCollectionName: string | null;
  selectedItemId: string;
  viewMode: "cards" | "table";
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

  if (viewMode === "table") {
    return (
      <table className="item-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Qty</th>
            <th>Location</th>
            <th>Tags</th>
            <th>Attributes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={item.id === selectedItemId ? "selected" : undefined}
              key={item.id}
              onClick={() => onSelect(item.id)}
            >
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.locationName ?? <span className="text-muted">—</span>}</td>
              <td>
                {item.tags.length > 0
                  ? item.tags.join(", ")
                  : <span className="text-muted">—</span>}
              </td>
              <td>{item.attributeValueCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
