import { Collection } from "../../api";

export function CollectionList({
  collections,
  selectedCollectionId,
  onSelect
}: Readonly<{
  collections: Collection[];
  selectedCollectionId: string;
  onSelect: (collectionId: string) => void;
}>) {
  if (collections.length === 0) {
    return (
      <div className="empty-state">
        <p>No collections yet.</p>
        <p>Create one to kick off the catalog.</p>
      </div>
    );
  }

  return (
    <ul className="collection-list">
      {collections.map((collection) => (
        <li
          className={`collection-card${collection.id === selectedCollectionId ? " selected" : ""}`}
          key={collection.id}
        >
          <button className="collection-select" onClick={() => onSelect(collection.id)} type="button">
            <h3>{collection.name}</h3>
            <p>
              Created{" "}
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short"
              }).format(new Date(collection.createdUtc))}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
