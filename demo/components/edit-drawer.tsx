"use client";

import { useCallback, useEffect, useRef } from "react";

interface EditDrawerProps {
  open: boolean;
  title: string;
  /** Blocks Escape and the close button while a save is in flight. */
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Right-side slide-over. Traps focus, restores it on close, locks body scroll, and
 * refuses to close mid-save so a half-written record set is never dismissed by a
 * stray Escape.
 */
export function EditDrawer({ open, title, busy, onClose, children }: EditDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div className="drawer">
      <div className="drawer__scrim" onClick={requestClose} aria-hidden="true" />
      <div
        className="drawer__panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="drawer__head">
          <h2 className="drawer__title" id="drawer-title">
            {title}
          </h2>
          <button
            type="button"
            className="drawer__close"
            onClick={requestClose}
            disabled={busy}
            aria-label="Close editor"
          >
            ×
          </button>
        </header>
        <div className="drawer__body">{children}</div>
      </div>
    </div>
  );
}
