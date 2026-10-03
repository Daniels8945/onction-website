import { useSyncExternalStore } from "react";

// Day / night presentation for the homepage's visual moments (the hero's 3D
// landscape and the energy-ecosystem story). "auto" follows the visitor's
// local time; choosing Day or Night in the hero toggle is remembered.
// Mirrored onto <html data-scene> so CSS can respond as well.
const KEY = "onction:scene";
const listeners = new Set();

function readPref() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "day" || v === "night" ? v : "auto";
  } catch {
    return "auto";
  }
}

let pref = typeof window !== "undefined" ? readPref() : "auto";

function autoMode() {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "day" : "night";
}

export function getSceneMode() {
  return pref === "auto" ? autoMode() : pref;
}

function apply() {
  if (typeof document !== "undefined") document.documentElement.dataset.scene = getSceneMode();
}
apply();

export function setScenePreference(value) {
  pref = value;
  try {
    value === "auto" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, value);
  } catch {
    /* storage unavailable — lasts for this visit */
  }
  apply();
  listeners.forEach((l) => l());
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSceneMode() {
  return useSyncExternalStore(subscribe, getSceneMode, () => "night");
}
