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

  const dialogOpen = keepMounted ? true : isOpen;
  const ariaHidden = keepMounted && !isOpen ? true : undefined;

  return (
    <dialog
      open={dialogOpen}
      className={className}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      aria-hidden={ariaHidden}
      onCancel={(event) => {
        event.preventDefault();
        if (!closeDisabled) onRequestClose?.();
      }}
    >
      {children}
    </dialog>
  );
}