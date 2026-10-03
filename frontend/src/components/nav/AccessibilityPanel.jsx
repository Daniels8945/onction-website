import { useEffect, useRef, useState } from "react";
import { getUserReducedMotion, setUserReducedMotion } from "../../motion/motionPreference.js";

// The header's accessibility button (the person icon). Two controls that
// genuinely change the experience: text size, and switching the site's
// animations off. Both persist for return visits.
const SIZE_KEY = "onction:text-size";
const SIZES = [
  { key: "base", label: "A", title: "Default text size" },
  { key: "lg", label: "A+", title: "Larger text" },
  { key: "xl", label: "A++", title: "Largest text" },
];

function readSize() {
  try {
    return localStorage.getItem(SIZE_KEY) || "base";
  } catch {
    return "base";
  }
}

export function applyStoredTextSize() {
  document.documentElement.dataset.textSize = readSize();
}

export default function AccessibilityPanel({ open, onClose, anchorRight }) {
  const [size, setSize] = useState(readSize);
  const [reduced, setReduced] = useState(getUserReducedMotion);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (!ref.current?.contains(e.target) && !e.target.closest("[data-a11y-toggle]")) onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function chooseSize(key) {
    setSize(key);
    document.documentElement.dataset.textSize = key;
    try {
      localStorage.setItem(SIZE_KEY, key);
    } catch {
      /* ignore */
    }
  }

  function toggleMotion() {
    setReduced(!reduced);
    setUserReducedMotion(!reduced);
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Accessibility options"
      aria-hidden={!open}
      style={{ right: anchorRight }}
      className={`absolute top-full z-50 mt-2 w-[min(92vw,300px)] border border-white/10 bg-navy-900 p-5 text-white shadow-2xl transition-all duration-400 ease-out-expo ${
        open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
      }`}
    >
      <p className="font-outfit text-xs uppercase tracking-[0.18em] text-teal-400">Accessibility</p>
      <div className="mt-4">
        <p className="text-sm text-white/80">Text size</p>
        <div className="mt-2 grid grid-cols-3 border border-white/15" role="radiogroup" aria-label="Text size">
          {SIZES.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={size === s.key}
              title={s.title}
              tabIndex={open ? 0 : -1}
              onClick={() => chooseSize(s.key)}
              className={`py-2 font-outfit transition ${size === s.key ? "bg-teal-500 text-navy-950" : "text-white/80 hover:bg-white/5"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-white/80">Reduce motion</p>
          <p className="text-xs text-white/45">Turns off animations and transitions.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={reduced}
          aria-label="Reduce motion"
          tabIndex={open ? 0 : -1}
          onClick={toggleMotion}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${reduced ? "bg-teal-500" : "bg-white/20"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-400 ${reduced ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      </div>
    </div>
  );
}
