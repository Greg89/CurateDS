import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export function CollectionActionsSection({
  collectionId,
  collectionName,
  isDeletePending,
  onDeleteCollection,
  onExportCollection
}: Readonly<{
  collectionId: string;
  collectionName: string;
  isDeletePending: boolean;
  onDeleteCollection: (collectionId: string) => void;
  onExportCollection: (collectionId: string, exportFileName: string) => void;
}>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <section className="panel panel-fit">
        <div className="panel-header">
          <h3>Export Data</h3>
          <p>Download all items and attribute definitions as CSV files in a ZIP archive.</p>
        </div>
        <button
          className="button"
          onClick={() => onExportCollection(collectionId, `${collectionName}-export.zip`)}
        >
          Export Collection
        </button>
      </section>

      <section className="panel panel-danger panel-fit">
        <div className="panel-header">
          <h3>Danger Zone</h3>
          <p>Permanently remove this collection and all its data.</p>
        </div>
        <button className="danger-button" onClick={() => setShowDeleteConfirm(true)}>
          Delete Collection
        </button>
      </section>

      {showDeleteConfirm ? (
        <ConfirmDialog
          title={`Delete "${collectionName}"?`}
          message="This will permanently delete the collection, all its items, attribute definitions, and associated data. This action cannot be undone."
          isPending={isDeletePending}
          onConfirm={() => onDeleteCollection(collectionId)}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      ) : null}
    </>
  );
}
