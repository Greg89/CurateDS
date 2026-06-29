import { DialogSurface } from "./DialogSurface";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  isPending,
  onConfirm,
  onCancel
}: Readonly<{
  title: string;
  message: string;
  confirmLabel?: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  return (
    <DialogSurface
      className="confirm-dialog-backdrop"
      labelledBy="confirm-dialog-title"
      closeDisabled={isPending}
      initialFocusSelector="[data-autofocus='true']"
      onRequestClose={onCancel}
    >
      <div className="confirm-dialog">
        <h3 id="confirm-dialog-title">{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button
            className="secondary-button"
            data-autofocus="true"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button className="danger-button" disabled={isPending} onClick={onConfirm}>
            {isPending ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </DialogSurface>
  );
}
