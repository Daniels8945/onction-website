import { useSyncExternalStore } from "react";

// Motion is reduced when the OS asks for it, or when the visitor turns
// animations off in the header's accessibility panel (persisted, and
// mirrored onto <html data-motion="reduced"> so CSS can respond too).
const KEY = "onction:reduce-motion";
const listeners = new Set();
const media = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

function readUserPref() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let userPref = typeof window !== "undefined" ? readUserPref() : false;

function apply() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.motion = isMotionReduced() ? "reduced" : "full";
}

export function isMotionReduced() {
  return userPref || !!media?.matches;
}

export function setUserReducedMotion(value) {
  userPref = value;
  try {
    value ? localStorage.setItem(KEY, "1") : localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — preference lasts for this visit only */
  }
  apply();
  listeners.forEach((l) => l());
}

export function getUserReducedMotion() {
  return userPref;
}

media?.addEventListener?.("change", () => {
  apply();
  listeners.forEach((l) => l());
});
apply();

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, isMotionReduced, () => false);
}
