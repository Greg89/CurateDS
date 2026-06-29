import { ReactNode, useEffect, useRef } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

export function DialogSurface({
  ariaLabel,
  children,
  className,
  closeDisabled = false,
  isOpen = true,
  keepMounted = false,
  initialFocusSelector,
  labelledBy,
  onRequestClose,
}: Readonly<{
  ariaLabel?: string;
  children: ReactNode;
  className: string;
  closeDisabled?: boolean;
  isOpen?: boolean;
  keepMounted?: boolean;
  initialFocusSelector?: string;
  labelledBy?: string;
  onRequestClose?: () => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!dialogRef.current) {
      return;
    }
    const dialogElement: HTMLDialogElement = dialogRef.current;

    const focusableElements = getFocusableElements(dialogElement);
    const preferredFocusTarget = initialFocusSelector
      ? dialogElement.querySelector<HTMLElement>(initialFocusSelector)
      : null;
    const focusTarget = preferredFocusTarget ?? focusableElements[0] ?? dialogElement;

    focusTarget.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") {
        return;
      }

      const currentFocusableElements = getFocusableElements(dialogElement);
      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstFocusableElement = currentFocusableElements[0];
      const lastFocusableElement = currentFocusableElements[currentFocusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
      } else if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }

    dialogElement.addEventListener("keydown", handleKeyDown);

    return () => {
      dialogElement.removeEventListener("keydown", handleKeyDown);

      const previousActiveElement = previousActiveElementRef.current;
      if (previousActiveElement?.isConnected) {
        previousActiveElement.focus();
      }
    };
  }, [initialFocusSelector, isOpen]);

  if (!keepMounted && !isOpen) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      open={isOpen}
      className={className}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      aria-hidden={!isOpen || undefined}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        if (!closeDisabled) onRequestClose?.();
      }}
    >
      {children}
    </dialog>
  );
}

function getFocusableElements(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(focusableSelector)]
    .filter((element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"));
}
