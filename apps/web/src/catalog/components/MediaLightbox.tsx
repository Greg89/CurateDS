import { useEffect } from "react";
import { MediaAsset } from "../../api";

export function MediaLightbox({
  assets,
  currentIndex,
  onClose,
  onNavigate,
  onSetPrimary,
  onDelete
}: Readonly<{
  assets: MediaAsset[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
}>) {
  const asset = assets[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < assets.length - 1;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, hasPrev, hasNext]);

  if (!asset) return null;

  return (
    <div
      aria-label="Image lightbox"
      aria-modal="true"
      className="media-lightbox-backdrop"
      role="dialog"
      onClick={onClose}
    >
      <div className="media-lightbox" onClick={(e) => e.stopPropagation()}>
        <button
          aria-label="Close lightbox"
          className="media-lightbox-close"
          type="button"
          onClick={onClose}
        >
          ×
        </button>

        <div className="media-lightbox-stage">
          {hasPrev && (
            <button
              aria-label="Previous image"
              className="media-lightbox-nav prev"
              type="button"
              onClick={() => onNavigate(currentIndex - 1)}
            >
              ‹
            </button>
          )}

          <img alt={asset.fileName} className="media-lightbox-img" src={asset.url} />

          {hasNext && (
            <button
              aria-label="Next image"
              className="media-lightbox-nav next"
              type="button"
              onClick={() => onNavigate(currentIndex + 1)}
            >
              ›
            </button>
          )}
        </div>

        <div className="media-lightbox-bar">
          <div className="media-lightbox-info">
            {asset.isPrimary && <span className="media-primary-badge">Primary</span>}
            <span className="media-lightbox-filename">{asset.fileName}</span>
            {assets.length > 1 && (
              <span className="media-lightbox-counter">
                {currentIndex + 1} of {assets.length}
              </span>
            )}
          </div>

          <div className="media-lightbox-actions">
            {!asset.isPrimary && (
              <button
                className="media-lightbox-set-primary"
                type="button"
                onClick={() => onSetPrimary(asset.id)}
              >
                Set as primary
              </button>
            )}
            <button
              className="media-lightbox-remove"
              type="button"
              onClick={() => {
                onDelete(asset.id);
                onClose();
              }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
