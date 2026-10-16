import { useEffect, useRef } from "react";

// Modal built on the native <dialog>: the browser handles focus trapping,
// Escape and the inert page behind it. Focus returns to whatever opened it.
// Page scroll is locked while open (iOS keeps scrolling the page otherwise).
export default function Dialog({ open, onClose, label, className = "", children }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      const opener = document.activeElement;
      d.showModal();
      const html = document.documentElement;
      const prev = html.style.overflow;
      html.style.overflow = "hidden";
      return () => {
        html.style.overflow = prev;
        if (d.open) d.close();
        opener?.focus?.({ preventScroll: true });
      };
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click on the backdrop lands on the <dialog> element itself.
      onClick={(e) => e.target === ref.current && onClose()}
      className={`dialog-pop m-auto max-h-[100dvh] max-w-none bg-transparent p-0 backdrop:bg-navy-950/85 backdrop:backdrop-blur-sm ${className}`}
    >
      {open && children}
    </dialog>
  );
}
