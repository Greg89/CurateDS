import { ItemDetail } from "../../api";
import { DialogSurface } from "./DialogSurface";
import { ItemDetailCard } from "./ItemDetailCard";

interface ItemDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  item: ItemDetail | null;
  isEditing: boolean;
  selectedCollectionName: string;
  onEdit: () => void;
  onDelete: () => void;
  onUploadMedia: (file: File) => void;
  onDeleteMedia: (mediaAssetId: string) => void;
  onSetPrimaryMedia: (mediaAssetId: string) => void;
  isUploadPending: boolean;
}

export function ItemDetailDrawer({
  isOpen,
  onClose,
  isLoading,
  item,
  isEditing,
  selectedCollectionName,
  onEdit,
  onDelete,
  onUploadMedia,
  onDeleteMedia,
  onSetPrimaryMedia,
  isUploadPending,
}: Readonly<ItemDetailDrawerProps>) {
  return (
    <DialogSurface
      ariaLabel="Item detail"
      className={`item-drawer detail-drawer${isOpen ? " open" : ""}`}
      isOpen={isOpen}
      initialFocusSelector="[aria-label='Close item detail']"
      onRequestClose={onClose}
    >
      <div className="drawer-header">
        <h2>Item Detail</h2>
        <button
          aria-label="Close item detail"
          className="secondary-button"
          onClick={onClose}
          type="button"
        >
          &#x2715;
        </button>
      </div>
      {isLoading && <p className="message">Loading item detail...</p>}
      <ItemDetailCard
        item={item}
        isEditing={isEditing}
        onEdit={onEdit}
        onDelete={onDelete}
        selectedCollectionName={selectedCollectionName}
        onUploadMedia={onUploadMedia}
        onDeleteMedia={onDeleteMedia}
        onSetPrimaryMedia={onSetPrimaryMedia}
        isUploadPending={isUploadPending}
      />
    </DialogSurface>
  );
}
