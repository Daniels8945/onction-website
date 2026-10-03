import { useSyncExternalStore } from "react";

// What the homepage hero shows behind its slides: the approved photography,
// the 3D landscape loop, or both layered (default). Remembered per visitor.
const KEY = "onction:hero-view";
const VIEWS = ["photo", "both", "animation"];
const listeners = new Set();

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return VIEWS.includes(v) ? v : "both";
  } catch {
    return "both";
  }
}

let view = typeof window !== "undefined" ? read() : "both";

export function setHeroView(v) {
  view = v;
  try {
    v === "both" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, v);
  } catch {
    /* storage unavailable — lasts for this visit */
  }
  listeners.forEach((l) => l());
}

export function useHeroView() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => view,
    () => "both"
  );
}
