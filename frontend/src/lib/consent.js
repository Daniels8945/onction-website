import { useSyncExternalStore } from "react";

// Analytics consent for the public site. Analytics (pageview beacons and the
// per-tab session id) only run once the visitor accepts; everything else the
// site stores is functional (their own display preferences) and needs no
// consent. The choice is asked again after 12 months.
const KEY = "onction:consent";
const MAX_AGE = 365 * 86400000;
const listeners = new Set();
let bannerOpen = false;

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || Date.now() - raw.at > MAX_AGE) return null;
    return raw.analytics ? "granted" : "denied";
  } catch {
    return null;
  }
}

let state = typeof window !== "undefined" ? read() : null;
const emit = () => listeners.forEach((l) => l());

export function getConsent() {
  return state;
}

export function analyticsAllowed() {
  return state === "granted";
}

export function setConsent(granted) {
  state = granted ? "granted" : "denied";
  bannerOpen = false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ analytics: granted, at: Date.now() }));
    if (!granted) sessionStorage.removeItem("onction_sid");
  } catch {
    /* storage blocked — choice lasts for this page view */
  }
  emit();
}

// "Cookie settings" in the footer reopens the banner.
export function openConsentBanner() {
  bannerOpen = true;
  emit();
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useConsent() {
  const consent = useSyncExternalStore(subscribe, () => state, () => null);
  const open = useSyncExternalStore(subscribe, () => bannerOpen, () => false);
  return { consent, showBanner: consent === null || open };
}
