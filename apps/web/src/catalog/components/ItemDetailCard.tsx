import { ItemDetail } from "../../api";
import { ItemHistorySection } from "./ItemHistorySection";
import { ItemMediaSection } from "./ItemMediaSection";
import { ItemDetailSummarySection } from "./ItemDetailSummarySection";

export function ItemDetailCard({
  item,
  isEditing,
  onEdit,
  onDelete,
  selectedCollectionName,
  onUploadMedia,
  onDeleteMedia,
  onSetPrimaryMedia,
  isUploadPending
}: Readonly<{
  item: ItemDetail | null;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  selectedCollectionName: string | null;
  onUploadMedia: (file: File) => void;
  onDeleteMedia: (mediaAssetId: string) => void;
  onSetPrimaryMedia: (mediaAssetId: string) => void;
  isUploadPending: boolean;
}>) {
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
      <ItemDetailSummarySection
        item={item}
        isEditing={isEditing}
        onDelete={onDelete}
        onEdit={onEdit}
      />

      <ItemMediaSection
        isUploadPending={isUploadPending}
        mediaAssets={item.mediaAssets ?? []}
        onDeleteMedia={onDeleteMedia}
        onSetPrimaryMedia={onSetPrimaryMedia}
        onUploadMedia={onUploadMedia}
      />

      <ItemHistorySection
        collectionId={item.collectionId}
        itemId={item.id}
      />
    </section>
  );
}
