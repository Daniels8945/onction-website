import { useEffect } from "react";

// A styled stand-in for window.confirm(), rendered via useConfirmDialog().
// Confirms on Enter, cancels on Escape or backdrop click.
export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", destructive = false, onConfirm, onCancel }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/50 px-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm border border-black/10 bg-white p-6 shadow-xl">
        <p className="font-syne text-lg font-semibold text-ink">{title}</p>
        {message && <p className="mt-2 text-sm text-slatey">{message}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="text-sm text-slatey hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={destructive ? "bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" : "btn-primary"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
