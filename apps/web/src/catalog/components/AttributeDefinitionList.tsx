import { useState } from "react";
import { AttributeDefinition } from "../../api";
import { ConfirmDialog } from "./ConfirmDialog";

export function AttributeDefinitionList({
  attributeDefinitions,
  selectedCollectionName,
  isDeletePending,
  onDelete
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  selectedCollectionName: string | null;
  isDeletePending?: boolean;
  onDelete?: (id: string) => void;
}>) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!selectedCollectionName) {
    return (
      <div className="empty-state">
        <p>No collection selected.</p>
        <p>Pick a collection to view and create its custom fields.</p>
      </div>
    );
  }

  if (attributeDefinitions.length === 0) {
    return (
      <div className="empty-state">
        <p>No attribute definitions yet for {selectedCollectionName}.</p>
        <p>Add one to start shaping item metadata.</p>
      </div>
    );
  }

  const confirmingDef = attributeDefinitions.find((d) => d.id === confirmDeleteId) ?? null;

  return (
    <>
      <ul className="attribute-list">
        {attributeDefinitions.map((attributeDefinition) => (
          <li className="attribute-card" key={attributeDefinition.id}>
            <div className="attribute-card-header">
              <h3>{attributeDefinition.name}</h3>
              <span className="attribute-pill">{attributeDefinition.dataType}</span>
            </div>
            <p className="attribute-meta">
              Key: <code>{attributeDefinition.key}</code>
            </p>
            <p className="attribute-meta">
              Required: {attributeDefinition.isRequired ? "Yes" : "No"} | Filterable:{" "}
              {attributeDefinition.isFilterable ? "Yes" : "No"}
            </p>
            {onDelete ? (
              <button
                className="danger-button"
                onClick={() => setConfirmDeleteId(attributeDefinition.id)}
                type="button"
              >
                Delete
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {confirmingDef ? (
        <ConfirmDialog
          title={`Delete "${confirmingDef.name}"?`}
          message="All item values for this attribute will be permanently removed. This action cannot be undone."
          isPending={isDeletePending ?? false}
          onConfirm={() => {
            onDelete?.(confirmingDef.id);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      ) : null}
    </>
  );
}
