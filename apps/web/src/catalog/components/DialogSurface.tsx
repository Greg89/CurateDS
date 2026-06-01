import { ReactNode } from "react";

export function DialogSurface({
  ariaLabel,
  children,
  className,
  closeDisabled = false,
  isOpen = true,
  keepMounted = false,
  labelledBy,
  onRequestClose,
}: Readonly<{
  ariaLabel?: string;
  children: ReactNode;
  className: string;
  closeDisabled?: boolean;
  isOpen?: boolean;
  keepMounted?: boolean;
  labelledBy?: string;
  onRequestClose?: () => void;
}>) {
  if (!keepMounted && !isOpen) {
    return null;
  }

  return (
    <dialog
      open={isOpen}
      className={className}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        if (!closeDisabled) onRequestClose?.();
      }}
    >
      {children}
    </dialog>
  );
}