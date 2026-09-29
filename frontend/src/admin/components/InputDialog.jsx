import { useEffect, useRef, useState } from "react";

// A styled stand-in for window.prompt(), rendered via usePromptDialog().
// Confirms on Enter, cancels on Escape or backdrop click.
export default function InputDialog({ title, label, placeholder, defaultValue, confirmLabel = "Create", onConfirm, onCancel }) {
  const [value, setValue] = useState(defaultValue || "");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/50 px-4" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm border border-black/10 bg-white p-6 shadow-xl"
      >
        <p className="font-syne text-lg font-semibold text-ink">{title}</p>
        {label && <label className="mb-1 mt-4 block text-xs font-medium text-slatey">{label}</label>}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={`w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500 ${label ? "" : "mt-4"}`}
        />
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="text-sm text-slatey hover:text-ink">
            Cancel
          </button>
          <button type="submit" disabled={!value.trim()} className="btn-primary disabled:opacity-60">
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
