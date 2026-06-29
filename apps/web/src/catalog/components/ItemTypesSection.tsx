import { FormEvent, useState } from "react";
import { ItemType } from "../../api";
import { ConfirmDialog } from "./ConfirmDialog";

export function ItemTypesSection({
  collectionName,
  createError,
  isCreatePending,
  isDeletePending,
  itemTypes,
  onCreate,
  onDelete
}: Readonly<{
  collectionName: string;
  createError: Error | null;
  isCreatePending: boolean;
  isDeletePending: boolean;
  itemTypes: ItemType[];
  onCreate: (input: { name: string; onSuccess: () => void }) => void;
  onDelete: (itemTypeId: string) => void;
}>) {
  const [itemTypeName, setItemTypeName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const confirmingType = itemTypes.find((itemType) => itemType.id === confirmDeleteId) ?? null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({
      name: itemTypeName,
      onSuccess: () => setItemTypeName("")
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Item Types</h3>
        <p>Define named types for items in {collectionName} (e.g. Machine, Part).</p>
      </div>

      <form className="collection-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Name</span>
          <input
            value={itemTypeName}
            onChange={(event) => setItemTypeName(event.target.value)}
            placeholder="Machine"
            maxLength={50}
          />
        </label>

        <button className="primary-button" disabled={isCreatePending} type="submit">
          {isCreatePending ? "Saving..." : "Add Item Type"}
        </button>

        {createError ? <p className="message error">{createError.message}</p> : null}
      </form>

      {itemTypes.length > 0 ? (
        <ul className="attribute-list">
          {itemTypes.map((itemType) => (
            <li className="attribute-card" key={itemType.id}>
              <div className="attribute-card-header">
                <h3>{itemType.name}</h3>
              </div>
              <button
                className="danger-button"
                onClick={() => setConfirmDeleteId(itemType.id)}
                type="button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <p>No item types yet.</p>
          <p>Add a type to differentiate items within this collection.</p>
        </div>
      )}

      {confirmingType ? (
        <ConfirmDialog
          title={`Delete "${confirmingType.name}"?`}
          message="Items assigned this type will become untyped. Attribute definitions scoped to this type will become global. This action cannot be undone."
          isPending={isDeletePending}
          onConfirm={() => {
            onDelete(confirmingType.id);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      ) : null}
    </section>
  );
}
