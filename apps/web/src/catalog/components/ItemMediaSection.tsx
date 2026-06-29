import { useRef, useState } from "react";
import { MediaAsset } from "../../api";
import { MediaLightbox } from "./MediaLightbox";

export function ItemMediaSection({
  isUploadPending,
  mediaAssets,
  onDeleteMedia,
  onSetPrimaryMedia,
  onUploadMedia
}: Readonly<{
  isUploadPending: boolean;
  mediaAssets: MediaAsset[];
  onDeleteMedia: (mediaAssetId: string) => void;
  onSetPrimaryMedia: (mediaAssetId: string) => void;
  onUploadMedia: (file: File) => void;
}>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="item-event-timeline">
        <h4 className="timeline-heading">Media</h4>
        <div className="media-gallery">
          {mediaAssets.map((asset, index) => (
            <button
              aria-label={`View ${asset.fileName}`}
              className={`media-thumb${asset.isPrimary ? " primary" : ""}`}
              key={asset.id}
              type="button"
              onClick={() => setLightboxIndex(index)}
            >
              <img alt={asset.fileName} src={asset.url} />
              {asset.isPrimary ? <span className="media-primary-badge">Primary</span> : null}
            </button>
          ))}
        </div>
        <div className="media-upload-row">
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            ref={fileInputRef}
            style={{ display: "none" }}
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onUploadMedia(file);
                event.target.value = "";
              }
            }}
          />
          <button
            className="secondary-button"
            disabled={isUploadPending}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {isUploadPending ? "Uploading..." : "Add Image"}
          </button>
        </div>
      </div>

      {lightboxIndex !== null && mediaAssets.length > 0 ? (
        <MediaLightbox
          assets={mediaAssets}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={onDeleteMedia}
          onNavigate={setLightboxIndex}
          onSetPrimary={onSetPrimaryMedia}
        />
      ) : null}
    </>
  );
}
